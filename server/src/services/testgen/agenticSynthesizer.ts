import { query } from '../../db/pool';
import { PLAYWRIGHT_SYNTHESIS_SYSTEM_PROMPT } from '../ai/prompts';
import { ByokService, AiProvider } from '../ai/byok.service';
import { synthesizePlaywrightTestSuite, SynthesisOptions } from './testSynthesizer';
import OpenAI, { AzureOpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';

export interface AgenticSynthesisOptions extends SynthesisOptions {
  solutionId?: string;
  userId?: string;
  provider?: string;
  model?: string;
  useAi?: boolean;
}

export class AgenticSynthesizer {
  /**
   * Synthesizes executable TypeScript Playwright test code from structured scenario definitions.
   * If useAi is true, invokes the configured AI model (Azure OpenAI, OpenAI, or Gemini)
   * grounded with Dataverse metadata.
   * If AI synthesis fails or no key is configured, throws an error rather than creating fake static code.
   * If useAi is false (or offline mode), uses the deterministic compiler.
   */
  static async synthesize(options: AgenticSynthesisOptions): Promise<string> {
    const { useAi, userId } = options;

    // 1. If AI synthesis is requested (default when useAi is true)
    if (useAi) {
      if (!userId) {
        throw new Error('AI Playwright synthesis requires an authenticated user session.');
      }
      return await this.synthesizeWithAi(options);
    }

    // 2. Deterministic compiler (explicitly offline / deterministic mode only)
    return synthesizePlaywrightTestSuite(options);
  }

  /**
   * Invokes an LLM with the scenario definitions, POM method signatures, and solution metadata.
   * Throws an error if no AI provider is configured or if the LLM call fails.
   */
  private static async synthesizeWithAi(options: AgenticSynthesisOptions): Promise<string> {
    const { userId, solutionId, suiteTitle, targetAppType, targetAppName, scenarios, provider, model } = options;
    if (!userId) {
      throw new Error('User ID is required for AI Playwright synthesis.');
    }

    // Auto-detect provider if not explicitly specified or if set to 'auto'
    const selectedProvider: AiProvider | null =
      provider && provider !== 'auto'
        ? (provider as AiProvider)
        : await ByokService.detectConfiguredProvider(userId);

    if (!selectedProvider) {
      throw new Error(
        'AI Playwright synthesis requested, but no active AI provider (Azure OpenAI, OpenAI, or Google Gemini) is configured in your BYOK vault. ' +
        'Please configure your API key in Settings -> AI Vault, or toggle off AI synthesis to compile with the deterministic engine.'
      );
    }

    // Fetch solution tables and markdown for metadata grounding
    let tableSchemas: any[] = [];
    let markdownSnippet = '';
    if (solutionId) {
      try {
        const tRes = await query('SELECT schema_name, display_name, columns FROM solution_tables WHERE solution_id = $1', [solutionId]);
        tableSchemas = tRes.rows.map((r) => ({
          schema: r.schema_name,
          displayName: r.display_name,
          columns: typeof r.columns === 'string' ? JSON.parse(r.columns) : r.columns || [],
        }));

        const sRes = await query('SELECT markdown_content FROM solutions WHERE id = $1', [solutionId]);
        if (sRes.rows.length > 0) {
          markdownSnippet = (sRes.rows[0].markdown_content || '').slice(0, 3000);
        }
      } catch (e) {
        console.warn('[AGENTIC SYNTHESIZER] Failed to fetch solution metadata grounding context:', e);
      }
    }

    const promptMessage = `Synthesize a complete, executable TypeScript Playwright test file for this test suite strictly modeled after 'microsoft/power-platform-playwright-samples':
Suite Title: "${suiteTitle}"
Target Application: "${targetAppName || 'Customer Service Hub'}" (${targetAppType || 'model_driven'})

Structured Test Scenarios:
${JSON.stringify(scenarios, null, 2)}

Dataverse Table Schemas (use exact column physical names for setTextInput, selectOption, setLookupValue):
${JSON.stringify(tableSchemas.slice(0, 8), null, 2)}

${markdownSnippet ? `Solution Specification Context:\n${markdownSnippet}\n` : ''}

Output Requirements (strictly following microsoft/power-platform-playwright-samples patterns):
1. Return ONLY valid TypeScript code starting with "import { test, expect } from '@playwright/test';".
2. Import the Page Object Model classes from '../templates/pom':
   import { AppProvider, LoginPage, ModelDrivenAppPage, GridComponent, FormComponent, CopilotChatComponent } from '../templates/pom';
3. In test.beforeEach(async ({ page }) => { ... }), ALWAYS accept the { page } fixture from Playwright and instantiate POM classes with page:
   appProvider = new AppProvider(page);
   loginPage = new LoginPage(page);
   modelApp = new ModelDrivenAppPage(page);
   grid = new GridComponent(page);
   form = new FormComponent(page);
   copilot = new CopilotChatComponent(page);
   await appProvider.navigateToApp(process.env.PP_APP_URL || '${options.environmentUrl || 'https://org.crm.dynamics.com'}');
   if (await loginPage.isLoginPage()) { await loginPage.login(); }
   await appProvider.waitForAppReady();
4. For every test scenario:
   test('Scenario Title', async ({ page }) => { ... });
   Wrap every execution step and verification inside "await test.step('...', async () => { ... });".
5. Call appropriate POM methods:
   - Sitemap navigation: await modelApp.navigateToSubArea('SubAreaName');
   - Command bar: await modelApp.clickCommandButton('New'); await modelApp.saveAndClose(); await modelApp.save();
   - Dialog confirmation: await modelApp.confirmDialog('Deactivate'); // or 'Activate', 'Delete', 'OK'
   - Grid: await grid.search('term'); await grid.clearSearch(); await grid.switchView('Active Employees'); await grid.assertRowContains('term'); await grid.openRow(0); await grid.openRecord('name'); await grid.selectRow('name');
   - Form: await form.setTextInput('field_schema', 'value'); await form.selectOption('field_schema', 'label'); await form.setLookupValue('field_schema', 'val'); await form.assertFieldValue('field_schema', 'expected_val');
   - Copilot: await copilot.sendMessage('prompt'); await copilot.assertResponseContains('reply');
6. Unified Interface Rules:
   - Never generate legacy CRM 2011 ribbon actions (e.g. clicking 'Results' button). For Advanced Find, use selectAdvancedFindTable or grid filters.
   - For deactivating/activating records: select row via selectRow, clickCommandButton('Deactivate'), then confirmDialog('Deactivate').
   - Use real Dataverse physical schema names from the provided table schemas.
7. CRITICAL - NEVER USE waitForNetworkIdle:
   - Do NOT generate 'await appProvider.waitForNetworkIdle();' or 'page.waitForLoadState("networkidle")'.
   - Dataverse continuously polls background telemetry, making networkidle a flaky anti-pattern.
   - Rely strictly on built-in POM auto-waiting (form.setTextInput, modelApp.clickCommandButton, grid.search, etc.).
   - Every test.step block must perform an actual action or assertion, never a standalone idle wait.
8. Return raw code without any markdown conversational preamble.`;

    let generatedCode = '';

    // 1. Azure OpenAI
    if (selectedProvider === 'azure_openai') {
      const azureConfig = await ByokService.getAzureOpenAiConfig(userId);
      if (!azureConfig || !azureConfig.apiKey) {
        throw new Error('Azure OpenAI is selected but no valid configuration or API key was found in the BYOK vault.');
      }
      try {
        const client = new AzureOpenAI({
          apiKey: azureConfig.apiKey.trim(),
          endpoint: azureConfig.endpoint.trim(),
          deployment: azureConfig.deployment || model || 'gpt-4o',
          apiVersion: azureConfig.apiVersion || '2024-06-01',
        });
        const res = await client.chat.completions.create({
          model: azureConfig.deployment || model || 'gpt-4o',
          messages: [
            { role: 'system', content: PLAYWRIGHT_SYNTHESIS_SYSTEM_PROMPT },
            { role: 'user', content: promptMessage },
          ],
        });
        generatedCode = res.choices[0]?.message?.content || '';
      } catch (err: any) {
        console.error('[AGENTIC SYNTHESIZER] Azure OpenAI error:', err);
        throw new Error(`Azure OpenAI Playwright synthesis failed: ${err.message}`);
      }
    }

    // 2. OpenAI
    else if (selectedProvider === 'openai') {
      const apiKey = await ByokService.getKey(userId, 'openai');
      if (!apiKey) {
        throw new Error('OpenAI is selected but no valid API key was found in the BYOK vault.');
      }
      try {
        const openai = new OpenAI({ apiKey: apiKey.trim() });
        const res = await openai.chat.completions.create({
          model: model || 'gpt-4o',
          messages: [
            { role: 'system', content: PLAYWRIGHT_SYNTHESIS_SYSTEM_PROMPT },
            { role: 'user', content: promptMessage },
          ],
        });
        generatedCode = res.choices[0]?.message?.content || '';
      } catch (err: any) {
        console.error('[AGENTIC SYNTHESIZER] OpenAI error:', err);
        throw new Error(`OpenAI Playwright synthesis failed: ${err.message}`);
      }
    }

    // 3. Gemini
    else if (selectedProvider === 'gemini') {
      const geminiKey = await ByokService.getKey(userId, 'gemini');
      if (!geminiKey) {
        throw new Error('Google Gemini is selected but no valid API key was found in the BYOK vault.');
      }
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
        const res = await ai.models.generateContent({
          model: model || 'gemini-2.0-flash',
          contents: promptMessage,
          config: {
            systemInstruction: PLAYWRIGHT_SYNTHESIS_SYSTEM_PROMPT,
          },
        });
        generatedCode = res.text || '';
      } catch (err: any) {
        console.error('[AGENTIC SYNTHESIZER] Google Gemini error:', err);
        throw new Error(`Google Gemini Playwright synthesis failed: ${err.message}`);
      }
    } else {
      throw new Error(`Unsupported AI provider: ${selectedProvider}`);
    }

    if (!generatedCode || generatedCode.trim().length === 0) {
      throw new Error(`AI provider (${selectedProvider}) returned an empty response during test code synthesis.`);
    }

    // 1. Clean up markdown code blocks if present
    let cleanCode = generatedCode.trim();
    const codeBlockMatch = cleanCode.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanCode = codeBlockMatch[1].trim();
    } else if (cleanCode.startsWith('```')) {
      cleanCode = cleanCode.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    // 2. Strip any conversational preamble before 'import { test'
    const importIdx = cleanCode.indexOf('import { test');
    if (importIdx !== -1) {
      cleanCode = cleanCode.slice(importIdx).trim();
    }

    // 3. Ensure test.beforeEach receives { page } Playwright fixture
    cleanCode = cleanCode.replace(
      /test\.beforeEach\s*\(\s*async\s*\(\s*\)\s*=>/g,
      'test.beforeEach(async ({ page }) =>'
    );

    // 4. Ensure POM constructors receive page fixture
    cleanCode = cleanCode.replace(/new\s+AppProvider\s*\(\s*\)/g, 'new AppProvider(page)');
    cleanCode = cleanCode.replace(/new\s+LoginPage\s*\(\s*\)/g, 'new LoginPage(page)');
    cleanCode = cleanCode.replace(/new\s+ModelDrivenAppPage\s*\(\s*\)/g, 'new ModelDrivenAppPage(page)');
    cleanCode = cleanCode.replace(/new\s+GridComponent\s*\(\s*\)/g, 'new GridComponent(page)');
    cleanCode = cleanCode.replace(/new\s+FormComponent\s*\(\s*\)/g, 'new FormComponent(page)');
    cleanCode = cleanCode.replace(/new\s+CopilotChatComponent\s*\(\s*\)/g, 'new CopilotChatComponent(page)');

    // 5. Ensure each test('...', async () => { receives { page }
    cleanCode = cleanCode.replace(
      /test\s*\(\s*(['"][^'"]+['"])\s*,\s*async\s*\(\s*\)\s*=>/g,
      'test($1, async ({ page }) =>'
    );

    // Basic sanity checks: must contain imports and test definitions
    if (cleanCode.includes('@playwright/test') && (cleanCode.includes('test(') || cleanCode.includes('test.describe('))) {
      return cleanCode;
    }

    throw new Error(
      `AI provider (${selectedProvider}) generated invalid test code that does not match Playwright test suite syntax.`
    );
  }
}
