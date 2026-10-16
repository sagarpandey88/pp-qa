import { query } from '../../db/pool';
import { ScenarioDefinition } from './testSynthesizer';
import { SCENARIO_GENERATION_SYSTEM_PROMPT } from '../ai/prompts';
import { ByokService } from '../ai/byok.service';
import OpenAI, { AzureOpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';

export interface GenerationOptions {
  focusArea?: string; // 'all' | 'entity_crud' | 'relationships' | 'cloud_flows' | 'copilot_agent' | 'custom'
  prompt?: string;
  targetAppType?: string;
  targetAppName?: string;
  provider?: string;
  model?: string;
}

export class AgenticScenarioGenerator {
  /**
   * Generates tailored test scenario cards grounded in the solution's actual
   * Dataverse tables, relationships, flows, Copilot topics, and Markdown specifications.
   */
  static async generateScenarios(
    solutionId: string,
    options: GenerationOptions = {},
    userId?: string
  ): Promise<ScenarioDefinition[]> {
    // 1. Fetch solution metadata from PostgreSQL
    const solRes = await query('SELECT * FROM solutions WHERE id = $1', [solutionId]);
    if (solRes.rows.length === 0) {
      throw new Error('Solution not found in database');
    }
    const sol = solRes.rows[0];

    const tablesRes = await query(
      'SELECT * FROM solution_tables WHERE solution_id = $1 ORDER BY schema_name ASC',
      [solutionId]
    );
    const flowsRes = await query(
      'SELECT * FROM solution_flows WHERE solution_id = $1 ORDER BY name ASC',
      [solutionId]
    );
    const botsRes = await query(
      'SELECT * FROM solution_copilot_bots WHERE solution_id = $1 ORDER BY display_name ASC',
      [solutionId]
    );

    const tables = tablesRes.rows;
    const flows = flowsRes.rows;
    const bots = botsRes.rows;
    const markdown = sol.markdown_content || '';

    const focusArea = options.focusArea || 'all';
    const targetAppType = options.targetAppType || 'model_driven';
    const targetAppName =
      options.targetAppName ||
      (targetAppType === 'copilot'
        ? bots[0]?.display_name || 'Support Copilot Agent'
        : 'Customer Service Hub');

    // 2. Check if AI generation is available via BYOK
    if (userId) {
      try {
        const aiScenarios = await this.tryGenerateWithAi(
          userId,
          sol,
          tables,
          flows,
          bots,
          markdown,
          { ...options, targetAppType, targetAppName, focusArea }
        );
        if (aiScenarios && aiScenarios.length > 0) {
          return aiScenarios;
        }
      } catch (err: any) {
        console.warn(`[AGENTIC SCENARIO GEN] AI generation failed (${err.message}). Falling back to deterministic metadata engine.`);
      }
    }

    // 3. Fallback: High-fidelity metadata-driven deterministic generator
    return this.generateFromMetadata(sol, tables, flows, bots, {
      focusArea,
      prompt: options.prompt,
      targetAppType,
      targetAppName,
    });
  }

  /**
   * Invokes an AI model (OpenAI, Azure OpenAI, or Gemini) with the grounded solution context.
   */
  private static async tryGenerateWithAi(
    userId: string,
    sol: any,
    tables: any[],
    flows: any[],
    bots: any[],
    markdown: string,
    options: GenerationOptions
  ): Promise<ScenarioDefinition[] | null> {
    if (options.provider === 'offline') {
      return null;
    }

    const detected = await ByokService.detectConfiguredProvider(userId);
    const provider = options.provider && options.provider !== 'auto' ? options.provider : (detected || 'openai');

    // Build compact metadata overview to ground the model
    const metadataSummary = {
      solutionName: sol.friendly_name || sol.unique_name,
      version: sol.version,
      targetAppType: options.targetAppType,
      targetAppName: options.targetAppName,
      focusArea: options.focusArea,
      userPrompt: options.prompt,
      tables: tables.map((t) => ({
        schemaName: t.schema_name,
        displayName: t.display_name,
        primaryId: t.primary_id_attribute,
        primaryName: t.primary_name_attribute,
        columns: (typeof t.columns === 'string' ? JSON.parse(t.columns) : t.columns || []).map((c: any) => ({
          name: c.schemaName,
          displayName: c.displayName,
          type: c.type,
          requiredLevel: c.requiredLevel,
          options: c.options?.slice(0, 5),
        })),
        relationships: typeof t.relationships === 'string' ? JSON.parse(t.relationships) : t.relationships || [],
      })),
      flows: flows.map((f) => ({
        name: f.name,
        triggerType: f.trigger_type,
        triggers: typeof f.triggers === 'string' ? JSON.parse(f.triggers) : f.triggers,
        actionsCount: (typeof f.actions === 'string' ? JSON.parse(f.actions) : f.actions || []).length,
      })),
      bots: bots.map((b) => ({
        displayName: b.display_name,
        schema: b.bot_schema_name,
        topics: typeof b.topics === 'string' ? JSON.parse(b.topics) : b.topics || [],
      })),
    };

    const promptMessage = `Generate realistic, executable Playwright test scenarios for this Power Platform solution:
Metadata Context:
${JSON.stringify(metadataSummary, null, 2)}

Solution Specification Excerpt:
${markdown.slice(0, 3000)}

Requirements:
1. Target App Type: ${options.targetAppType}
2. Target App Name: ${options.targetAppName}
3. Focus Area: ${options.focusArea}
${options.prompt ? `4. Custom User Request: ${options.prompt}` : ''}

Output Format: A JSON array of ScenarioDefinition objects with title, targetAppType, targetAppName, preconditions, steps, expectedAssertions.`;

    let rawJson = '';

    // 1. Try Azure OpenAI
    if (provider === 'azure_openai') {
      const azureConfig = await ByokService.getAzureOpenAiConfig(userId);
      if (azureConfig) {
        const client = new AzureOpenAI({
          apiKey: azureConfig.apiKey.trim(),
          endpoint: azureConfig.endpoint.trim(),
          deployment: azureConfig.deployment || options.model || 'gpt-4o',
          apiVersion: azureConfig.apiVersion || '2024-06-01',
        });
        const res = await client.chat.completions.create({
          model: azureConfig.deployment || options.model || 'gpt-4o',
          messages: [
            { role: 'system', content: SCENARIO_GENERATION_SYSTEM_PROMPT },
            { role: 'user', content: promptMessage },
          ],
          response_format: { type: 'json_object' },
        });
        rawJson = res.choices[0]?.message?.content || '';
      }
    }

    // 2. Try Standard OpenAI
    if (!rawJson && (provider === 'openai' || !provider)) {
      const apiKey = await ByokService.getKey(userId, 'openai');
      if (apiKey) {
        const openai = new OpenAI({ apiKey: apiKey.trim() });
        const res = await openai.chat.completions.create({
          model: options.model || 'gpt-4o',
          messages: [
            { role: 'system', content: SCENARIO_GENERATION_SYSTEM_PROMPT },
            { role: 'user', content: promptMessage },
          ],
          response_format: { type: 'json_object' },
        });
        rawJson = res.choices[0]?.message?.content || '';
      }
    }

    // 3. Try Gemini
    if (!rawJson && provider === 'gemini') {
      const geminiKey = await ByokService.getKey(userId, 'gemini');
      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
        const res = await ai.models.generateContent({
          model: options.model || 'gemini-2.0-flash',
          contents: promptMessage,
          config: {
            systemInstruction: SCENARIO_GENERATION_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
          },
        });
        rawJson = res.text || '';
      }
    }

    if (!rawJson) return null;

    // Parse output JSON
    try {
      const parsed = JSON.parse(rawJson);
      const list = Array.isArray(parsed) ? parsed : parsed.scenarios || parsed.items || [];
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any, idx: number) => ({
          id: item.id || `ai-scenario-${Date.now()}-${idx + 1}`,
          title: item.title || `Scenario ${idx + 1}`,
          targetAppType: item.targetAppType || options.targetAppType || 'model_driven',
          targetAppName: item.targetAppName || options.targetAppName || 'Customer Service Hub',
          preconditions: Array.isArray(item.preconditions) ? item.preconditions : [],
          steps: Array.isArray(item.steps) ? item.steps : [],
          expectedAssertions: Array.isArray(item.expectedAssertions) ? item.expectedAssertions : [],
        }));
      }
    } catch (parseErr) {
      console.warn('[AGENTIC SCENARIO GEN] Failed to parse model JSON output:', parseErr);
    }

    return null;
  }

  /**
   * Deterministic metadata-aware generator that constructs high-fidelity scenario cards
   * based on the exact Dataverse tables, attributes, relationships, flows, and bots.
   */
  static generateFromMetadata(
    sol: any,
    tables: any[],
    flows: any[],
    bots: any[],
    options: {
      focusArea: string;
      prompt?: string;
      targetAppType: string;
      targetAppName: string;
    }
  ): ScenarioDefinition[] {
    const { focusArea, targetAppType, targetAppName } = options;
    const scenarios: ScenarioDefinition[] = [];

    // Helper to generate unique scenario ID
    const nextId = () => `scenario-${Date.now()}-${scenarios.length + 1}`;

    // --- 1. Entity CRUD & Validation Scenarios ---
    if (focusArea === 'all' || focusArea === 'entity_crud' || focusArea === 'relationships') {
      for (const tbl of tables) {
        const columns = typeof tbl.columns === 'string' ? JSON.parse(tbl.columns) : tbl.columns || [];
        const relationships = typeof tbl.relationships === 'string' ? JSON.parse(tbl.relationships) : tbl.relationships || [];
        const rawName = tbl.display_name || tbl.schema_name;
        const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : 'Record';

        const nameCol =
          columns.find((c: any) => c.schemaName?.toLowerCase() === 'name' || c.schemaName?.toLowerCase().includes('name')) ||
          columns[0];
        const requiredCols = columns.filter((c: any) => c.requiredLevel === 'required' || c.requiredLevel === 'systemRequired');
        const picklistCols = columns.filter((c: any) => c.type === 'picklist' || (c.options && c.options.length > 0));
        const phoneCol = columns.find((c: any) => c.schemaName?.toLowerCase().includes('phone') || c.schemaName?.toLowerCase().includes('telephone'));
        const boolCols = columns.filter((c: any) => c.type === 'boolean');

        // Happy Path: Create Record with diverse field types
        const createSteps: string[] = [
          `Click "+ New" button on the Model-Driven App command bar`,
          `Wait for ${displayName} form to load and ms-spinner dismissal`,
        ];

        const recordName = `Fabrikam ${displayName} Test Record`;
        if (nameCol) {
          createSteps.push(`Fill "${nameCol.displayName || nameCol.schemaName}" with "${recordName}"`);
        }

        if (phoneCol) {
          createSteps.push(`Fill "${phoneCol.displayName || phoneCol.schemaName}" with "+1 (555) 019-9482"`);
        }

        if (picklistCols.length > 0) {
          const pCol = picklistCols[0];
          const optLabel = pCol.options?.[0]?.label || 'Consulting';
          createSteps.push(`Select "${pCol.displayName || pCol.schemaName}" dropdown option "${optLabel}"`);
        }

        if (boolCols.length > 0) {
          createSteps.push(`Toggle switch "${boolCols[0].displayName || boolCols[0].schemaName}" to "Yes"`);
        }

        createSteps.push(`Click "Save & Close" button on the command bar`);
        createSteps.push(`Search "${recordName}" in the active view grid`);

        scenarios.push({
          id: nextId(),
          title: `Create ${displayName} Record & Verify Grid Persistence`,
          targetAppType: 'model_driven',
          targetAppName,
          preconditions: [
            `Active Dataverse session with System Customizer role`,
            `Navigate to ${displayName} view in ${targetAppName}`,
          ],
          steps: createSteps,
          expectedAssertions: [
            `Form successfully saves without validation errors`,
            `Active ${displayName}s grid contains newly created record "${recordName}"`,
          ],
        });

        // Form Validation: Missing Mandatory Fields
        if (requiredCols.length > 0) {
          const req = requiredCols[0];
          const reqName = req.displayName || req.schemaName;
          scenarios.push({
            id: nextId(),
            title: `Validate ${displayName} Required Fields Constraints`,
            targetAppType: 'model_driven',
            targetAppName,
            preconditions: [
              `Navigate to ${displayName} form in ${targetAppName}`,
            ],
            steps: [
              `Click "+ New" button on the command bar`,
              `Leave mandatory field "${reqName}" blank`,
              `Click "Save" on the command bar`,
            ],
            expectedAssertions: [
              `Form displays required field error banner for "${reqName}"`,
              `Record is not saved and remains in dirty state`,
            ],
          });
        }

        // Relational Flows: Parent-Child Relationship Check
        if (focusArea === 'all' || focusArea === 'relationships') {
          const oneToMany = relationships.filter((r: any) => r.type === 'OneToMany' || r.EntityRelationshipType === 'OneToMany');
          if (oneToMany.length > 0) {
            const rel = oneToMany[0];
            const childEntity = rel.referencingEntity || rel.ReferencingEntityName || 'Contact';
            scenarios.push({
              id: nextId(),
              title: `Verify 1:N Relationship Between ${displayName} and ${childEntity}`,
              targetAppType: 'model_driven',
              targetAppName,
              preconditions: [
                `Existing ${displayName} parent record exists in ${targetAppName}`,
                `User has read/write privileges on both ${displayName} and ${childEntity}`,
              ],
              steps: [
                `Open parent ${displayName} record in ${targetAppName}`,
                `Switch to Related tab and select "${childEntity}" subgrid`,
                `Click "+ New ${childEntity}" on the subgrid command bar`,
                `Fill "Name" with "Child ${childEntity} for ${displayName}"`,
                `Click "Save & Close" on child form`,
              ],
              expectedAssertions: [
                `Subgrid updates to reflect linked child ${childEntity} record`,
                `Referencing lookup matches parent ${displayName}`,
              ],
            });
          }
        }
      }
    }

    // --- 2. Cloud Flow Event Triggers & SLA ---
    if (focusArea === 'all' || focusArea === 'cloud_flows') {
      for (const flow of flows) {
        const flowName = flow.name;
        scenarios.push({
          id: nextId(),
          title: `Trigger Cloud Flow "${flowName}" & Verify Run State`,
          targetAppType: 'model_driven',
          targetAppName,
          preconditions: [
            `Automated Cloud Flow "${flowName}" is turned on in Dataverse`,
            `Target user has flow execution privileges`,
          ],
          steps: [
            `Open target record in ${targetAppName}`,
            `Trigger automated workflow condition for "${flowName}"`,
            `Save record to initiate Dataverse webhook dispatch`,
            `Wait for asynchronous Cloud Flow run completion`,
          ],
          expectedAssertions: [
            `Cloud Flow trigger evaluates successfully`,
            `Automated notifications and status transitions complete with HTTP 200 OK`,
          ],
        });
      }
    }

    // --- 3. Copilot Studio Conversational & Generative Grounding ---
    if (focusArea === 'all' || focusArea === 'copilot_agent') {
      for (const bot of bots) {
        const botName = bot.display_name || bot.bot_schema_name || 'Support Copilot';
        const topics = typeof bot.topics === 'string' ? JSON.parse(bot.topics) : bot.topics || [];
        const greetingTopic = topics.find((t: any) => t.displayName?.toLowerCase().includes('greeting')) || topics[0];
        const triggerPhrase = greetingTopic?.triggerPhrases?.[0] || 'Hi, I need assistance with my service';

        scenarios.push({
          id: nextId(),
          title: `Verify ${botName} Conversational Intent & Generative Fallback`,
          targetAppType: 'copilot',
          targetAppName: botName,
          preconditions: [
            `Copilot Studio embedded web chat widget initialized`,
            `Agent "${botName}" deployed and published`,
          ],
          steps: [
            `Send greeting prompt: "${triggerPhrase}"`,
            `Verify response matches expected PVA greeting dialog`,
            `Send enterprise knowledge inquiry: "What is your enterprise SLA escalation window?"`,
            `Wait for Generative Answers node to search grounded knowledge sources`,
          ],
          expectedAssertions: [
            `Copilot returns generative response citing grounded enterprise documentation`,
            `No unhandled topic fallbacks triggered`,
          ],
        });
      }
    }

    // Default smoke fallback if no components were present
    if (scenarios.length === 0) {
      scenarios.push(
        {
          id: nextId(),
          title: `Verify ${sol.friendly_name || sol.unique_name} App Shell & Ready State`,
          targetAppType,
          targetAppName,
          preconditions: [`User authenticated with System Administrator or System Customizer role`],
          steps: [
            `Navigate to ${targetAppName}`,
            `Wait for Power Platform shell and command bar to initialize`,
            `Verify primary sitemap subarea is visible`,
          ],
          expectedAssertions: [
            `App shell loads without error dialogs`,
            `Command bar actions are enabled and clickable`,
          ],
        },
        {
          id: nextId(),
          title: `Create Verification Record in ${sol.friendly_name || sol.unique_name}`,
          targetAppType,
          targetAppName,
          preconditions: [`Active Dataverse session`],
          steps: [
            `Click "+ New" button on the command bar`,
            `Fill "Name" with "Automated QA Verification Record"`,
            `Click "Save & Close"`,
          ],
          expectedAssertions: [
            `Record is successfully created`,
            `View displays newly created record`,
          ],
        }
      );
    }

    return scenarios;
  }
}

