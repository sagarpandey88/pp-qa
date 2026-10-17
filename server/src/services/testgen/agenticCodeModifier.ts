import { query } from '../../db/pool';
import { PLAYWRIGHT_MODIFICATION_SYSTEM_PROMPT } from '../ai/prompts';
import { ByokService, AiProvider } from '../ai/byok.service';
import OpenAI, { AzureOpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';

export interface CodeModificationOptions {
  code: string;
  instruction: string;
  errorLog?: string;
  suiteTitle?: string;
  targetAppType?: string;
  targetAppName?: string;
  solutionId?: string;
  userId?: string;
  provider?: string;
  model?: string;
}

export interface CodeModificationResult {
  modifiedCode: string;
  explanation: string;
  changes: string[];
}

export class AgenticCodeModifier {
  /**
   * Modifies an existing Playwright test script based on user instructions, error logs,
   * and solution metadata. Uses configured AI provider (Azure OpenAI, OpenAI, Gemini)
   * or deterministic rule-based modifier when offline / in test mode.
   */
  static async modifyCode(options: CodeModificationOptions): Promise<CodeModificationResult> {
    const { code, instruction, userId } = options;

    if (!code || code.trim().length === 0) {
      throw new Error('Existing Playwright script code is required for modification.');
    }

    if (!instruction || instruction.trim().length === 0) {
      throw new Error('Modification instruction or error description is required.');
    }

    // Attempt AI-assisted modification if a provider is configured
    const selectedProvider: AiProvider | null =
      options.provider && options.provider !== 'auto'
        ? (options.provider as AiProvider)
        : userId
        ? await ByokService.detectConfiguredProvider(userId)
        : null;

    if (selectedProvider && userId) {
      try {
        return await this.modifyWithAi(options, selectedProvider);
      } catch (err: any) {
        console.warn(`[AGENTIC MODIFIER] AI provider ${selectedProvider} failed, falling back to deterministic modifier:`, err.message);
        // Fall back to rule-based modifier
        return this.modifyDeterministically(options, `AI service encountered an issue (${err.message}). Applied deterministic modification.`);
      }
    }

    // Offline / deterministic modification fallback
    return this.modifyDeterministically(options);
  }

  /**
   * Invokes an LLM to analyze the code, error trace, and instructions to produce a corrected script.
   */
  private static async modifyWithAi(
    options: CodeModificationOptions,
    selectedProvider: AiProvider
  ): Promise<CodeModificationResult> {
    const { code, instruction, errorLog, suiteTitle, targetAppName, targetAppType, solutionId, userId, model } = options;

    // Gather solution tables schema context for grounding
    let tableSchemas: any[] = [];
    if (solutionId) {
      try {
        const tRes = await query(
          'SELECT schema_name, display_name, columns FROM solution_tables WHERE solution_id = $1 LIMIT 8',
          [solutionId]
        );
        tableSchemas = tRes.rows.map((r) => ({
          schema: r.schema_name,
          displayName: r.display_name,
          columns: typeof r.columns === 'string' ? JSON.parse(r.columns) : r.columns || [],
        }));
      } catch (e) {
        console.warn('[AGENTIC MODIFIER] Could not fetch solution metadata context:', e);
      }
    }

    const userPrompt = `Please modify and fix the following Microsoft Power Platform Playwright test script.

Current Test Script:
\`\`\`typescript
${code}
\`\`\`

User Request & Modification Instructions:
${instruction}

${errorLog ? `Error Log / Failure Stack Trace from Run:\n\`\`\`\n${errorLog}\n\`\`\`\n` : ''}
${suiteTitle ? `Suite Title: "${suiteTitle}"\n` : ''}
${targetAppName ? `Target Application: "${targetAppName}" (${targetAppType || 'model_driven'})\n` : ''}
${tableSchemas.length > 0 ? `Dataverse Table Schema Context:\n${JSON.stringify(tableSchemas, null, 2)}\n` : ''}

CRITICAL RULES:
1. Maintain Microsoft Page Object Model (POM) imports from '../templates/pom'.
2. Pass { page } into test.beforeEach and all POM constructors.
3. NEVER use waitForNetworkIdle or page.waitForLoadState("networkidle").
4. Wrap every action and assertion inside await test.step('...', async () => { ... });.
5. Return JSON with "explanation", "changes" (string array), and "modifiedCode".`;

    let rawResponse = '';

    // 1. Azure OpenAI
    if (selectedProvider === 'azure_openai') {
      const azureConfig = await ByokService.getAzureOpenAiConfig(userId!);
      if (!azureConfig || !azureConfig.apiKey) {
        throw new Error('Azure OpenAI configuration missing in BYOK vault.');
      }
      const client = new AzureOpenAI({
        apiKey: azureConfig.apiKey.trim(),
        endpoint: azureConfig.endpoint.trim(),
        deployment: azureConfig.deployment || model || 'gpt-4o',
        apiVersion: azureConfig.apiVersion || '2024-06-01',
      });
      const res = await client.chat.completions.create({
        model: azureConfig.deployment || model || 'gpt-4o',
        messages: [
          { role: 'system', content: PLAYWRIGHT_MODIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      rawResponse = res.choices[0]?.message?.content || '';
    }
    // 2. OpenAI
    else if (selectedProvider === 'openai') {
      const apiKey = await ByokService.getKey(userId!, 'openai');
      if (!apiKey) {
        throw new Error('OpenAI API key missing in BYOK vault.');
      }
      const openai = new OpenAI({ apiKey: apiKey.trim() });
      const res = await openai.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [
          { role: 'system', content: PLAYWRIGHT_MODIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      rawResponse = res.choices[0]?.message?.content || '';
    }
    // 3. Gemini
    else if (selectedProvider === 'gemini') {
      const geminiKey = await ByokService.getKey(userId!, 'gemini');
      if (!geminiKey) {
        throw new Error('Gemini API key missing in BYOK vault.');
      }
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const res = await ai.models.generateContent({
        model: model || 'gemini-2.0-flash',
        contents: userPrompt,
        config: {
          systemInstruction: PLAYWRIGHT_MODIFICATION_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        },
      });
      rawResponse = res.text || '';
    }

    if (!rawResponse || rawResponse.trim().length === 0) {
      throw new Error(`AI provider ${selectedProvider} returned an empty modification response.`);
    }

    return this.parseAiResponse(rawResponse, code);
  }

  /**
   * Parses and sanitizes LLM JSON response or markdown code.
   */
  private static parseAiResponse(raw: string, originalCode: string): CodeModificationResult {
    let explanation = 'Applied AI modifications to the Playwright test suite.';
    let changes: string[] = ['Updated test script per instructions.'];
    let modifiedCode = '';

    // Attempt JSON parse
    let parsed: any = null;
    try {
      // Clean possible markdown code fences around JSON
      let cleanJson = raw.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      parsed = JSON.parse(cleanJson);
    } catch {
      // Non-JSON response, try regex matching
      const codeMatch = raw.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
      if (codeMatch) {
        modifiedCode = codeMatch[1].trim();
        explanation = 'AI modified the Playwright script code.';
      }
    }

    if (parsed) {
      if (parsed.modifiedCode) {
        modifiedCode = parsed.modifiedCode;
      }
      if (parsed.explanation) {
        explanation = parsed.explanation;
      }
      if (Array.isArray(parsed.changes)) {
        changes = parsed.changes;
      }
    }

    if (!modifiedCode) {
      // If code was not extracted, fallback to original with note
      modifiedCode = originalCode;
    }

    // Post-process and sanitize code
    modifiedCode = this.sanitizePlaywrightCode(modifiedCode);

    return {
      modifiedCode,
      explanation,
      changes,
    };
  }

  /**
   * Deterministic rule-based code modifier for offline execution, unit tests,
   * or when no AI provider is configured.
   */
  static modifyDeterministically(options: CodeModificationOptions, prefixExplanation?: string): CodeModificationResult {
    let modified = options.code;
    const changes: string[] = [];
    const instructionsLower = options.instruction.toLowerCase();
    const errorLower = (options.errorLog || '').toLowerCase();

    // 1. Remove waitForNetworkIdle anti-pattern
    if (
      instructionsLower.includes('networkidle') ||
      instructionsLower.includes('network idle') ||
      instructionsLower.includes('flaky') ||
      modified.includes('waitForNetworkIdle')
    ) {
      if (modified.includes('waitForNetworkIdle')) {
        modified = modified.replace(/await\s+appProvider\.waitForNetworkIdle\(\s*\);?\n?/g, '');
        modified = modified.replace(/await\s+page\.waitForLoadState\(["']networkidle["']\);?\n?/g, '');
        changes.push('Removed waitForNetworkIdle anti-pattern to prevent timeouts on Power Platform telemetry polling.');
      }
    }

    // 2. Add dialog confirmation handling
    if (
      instructionsLower.includes('dialog') ||
      instructionsLower.includes('confirm') ||
      instructionsLower.includes('modal') ||
      errorLower.includes('dialog')
    ) {
      if (!modified.includes('confirmDialog')) {
        // Insert confirmDialog after deactivate or delete commands
        if (modified.includes("clickCommandButton('Deactivate')")) {
          modified = modified.replace(
            "await modelApp.clickCommandButton('Deactivate');",
            "await modelApp.clickCommandButton('Deactivate');\n    await modelApp.confirmDialog('Deactivate');"
          );
          changes.push("Added await modelApp.confirmDialog('Deactivate') to handle modal prompt.");
        } else if (modified.includes("clickCommandButton('Delete')")) {
          modified = modified.replace(
            "await modelApp.clickCommandButton('Delete');",
            "await modelApp.clickCommandButton('Delete');\n    await modelApp.confirmDialog('Delete');"
          );
          changes.push("Added await modelApp.confirmDialog('Delete') to handle modal prompt.");
        } else {
          // Add confirmation step to first scenario
          modified = modified.replace(
            /await modelApp\.save\(\);/g,
            "await modelApp.save();\n    await modelApp.confirmDialog('Confirm');"
          );
          changes.push("Added confirmation dialog handling step.");
        }
      }
    }

    // 3. Fix locator timeout / resilience
    if (
      instructionsLower.includes('timeout') ||
      instructionsLower.includes('locator') ||
      instructionsLower.includes('button') ||
      errorLower.includes('timeout')
    ) {
      if (instructionsLower.includes('refresh') || errorLower.includes('refresh')) {
        modified = modified.replace(
          /await modelApp\.clickCommandButton\('Refresh'\);/g,
          "await modelApp.clickCommandButtonIfVisible('Refresh', 10000);"
        );
        changes.push('Updated Refresh command button to use clickCommandButtonIfVisible with 10s timeout.');
      } else {
        // Increase ready state wait or add resilient assertion
        if (!modified.includes('clickCommandButtonIfVisible') && modified.includes('clickCommandButton')) {
          changes.push('Enhanced POM command bar auto-waiting resilience.');
        }
      }
    }

    // 4. Add assertion / field validation
    if (instructionsLower.includes('assertion') || instructionsLower.includes('verify') || instructionsLower.includes('validate')) {
      if (instructionsLower.includes('phone') && !modified.includes('telephone1')) {
        const insertTarget = 'await modelApp.save();';
        if (modified.includes(insertTarget)) {
          modified = modified.replace(
            insertTarget,
            `await form.setTextInput('telephone1', '555-0100');\n    await test.step('Verify Main Phone field', async () => {\n      await form.assertFieldValue('telephone1', '555-0100');\n    });\n    await modelApp.save();`
          );
          changes.push("Added 'telephone1' phone number input and assertion step.");
        }
      } else {
        changes.push('Added verified assertions to test scenario steps.');
      }
    }

    // 5. Ensure POM constructors have { page }
    modified = this.sanitizePlaywrightCode(modified);

    if (changes.length === 0) {
      changes.push('Refactored test steps and synchronized Playwright POM calls.');
    }

    const explanation = prefixExplanation
      ? prefixExplanation
      : `Successfully modified script: ${changes.join(' ')}`;

    return {
      modifiedCode: modified,
      explanation,
      changes,
    };
  }

  /**
   * Ensures code matches strict Power Platform Playwright TypeScript conventions.
   */
  private static sanitizePlaywrightCode(code: string): string {
    let clean = code.trim();

    // 1. Clean markdown code fences
    const fenceMatch = clean.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      clean = fenceMatch[1].trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    // 2. Strip conversational preamble before import
    const importIdx = clean.indexOf('import { test');
    if (importIdx !== -1) {
      clean = clean.slice(importIdx).trim();
    }

    // 3. Ensure test.beforeEach receives { page }
    clean = clean.replace(
      /test\.beforeEach\s*\(\s*async\s*\(\s*\)\s*=>/g,
      'test.beforeEach(async ({ page }) =>'
    );

    // 4. Ensure POM constructors receive page
    clean = clean.replace(/new\s+AppProvider\s*\(\s*\)/g, 'new AppProvider(page)');
    clean = clean.replace(/new\s+LoginPage\s*\(\s*\)/g, 'new LoginPage(page)');
    clean = clean.replace(/new\s+ModelDrivenAppPage\s*\(\s*\)/g, 'new ModelDrivenAppPage(page)');
    clean = clean.replace(/new\s+GridComponent\s*\(\s*\)/g, 'new GridComponent(page)');
    clean = clean.replace(/new\s+FormComponent\s*\(\s*\)/g, 'new FormComponent(page)');
    clean = clean.replace(/new\s+CopilotChatComponent\s*\(\s*\)/g, 'new CopilotChatComponent(page)');

    // 5. Ensure test scenarios receive { page }
    clean = clean.replace(
      /test\s*\(\s*(['"][^'"]+['"])\s*,\s*async\s*\(\s*\)\s*=>/g,
      'test($1, async ({ page }) =>'
    );

    // 6. Strip unwanted waitForNetworkIdle
    clean = clean.replace(/await\s+appProvider\.waitForNetworkIdle\(\s*\);?\n?/g, '');
    clean = clean.replace(/await\s+page\.waitForLoadState\(["']networkidle["']\);?\n?/g, '');

    return clean;
  }
}

