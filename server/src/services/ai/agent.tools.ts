import { query } from '../../db/pool';

export interface ProposedScenario {
  id?: string;
  title: string;
  targetAppType: 'model_driven' | 'canvas' | 'copilot';
  targetAppName?: string;
  preconditions: string[];
  steps: string[];
  expectedAssertions: string[];
}

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'search_solution_metadata',
      description: 'Search extracted Power Platform solution metadata for tables, columns, cloud flows, and copilot topics.',
      parameters: {
        type: 'object',
        properties: {
          queryText: {
            type: 'string',
            description: 'Keyword to search for (e.g. account, escalation, approval, phone, reset password)',
          },
          solutionId: {
            type: 'string',
            description: 'Optional solution ID to scope the search',
          },
        },
        required: ['queryText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_component_details',
      description: 'Get full structural schema details for a specific entity table, cloud flow, or Copilot agent.',
      parameters: {
        type: 'object',
        properties: {
          componentType: {
            type: 'string',
            enum: ['table', 'flow', 'bot'],
            description: 'Type of component to retrieve',
          },
          componentName: {
            type: 'string',
            description: 'Schema name or display name of the component',
          },
          solutionId: {
            type: 'string',
            description: 'Solution ID containing the component',
          },
        },
        required: ['componentType', 'componentName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_markdown_section',
      description: 'Read a specific section from the generated modular solution Markdown documentation.',
      parameters: {
        type: 'object',
        properties: {
          sectionTitle: {
            type: 'string',
            description: 'Title of the section (e.g. "Data Dictionary", "Cloud Flows", "Copilot Studio", "QA Readiness")',
          },
          solutionId: {
            type: 'string',
            description: 'Solution ID to read documentation for',
          },
        },
        required: ['sectionTitle'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_test_scenarios',
      description: 'Propose structured Playwright test scenarios to be reviewed and converted into automated tests.',
      parameters: {
        type: 'object',
        properties: {
          scenarios: {
            type: 'array',
            description: 'List of test scenarios to propose',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Clear descriptive test scenario title' },
                targetAppType: { type: 'string', enum: ['model_driven', 'canvas', 'copilot'] },
                targetAppName: { type: 'string', description: 'Name of the Model-Driven App or Copilot bot' },
                preconditions: { type: 'array', items: { type: 'string' } },
                steps: { type: 'array', items: { type: 'string' } },
                expectedAssertions: { type: 'array', items: { type: 'string' } },
              },
              required: ['title', 'targetAppType', 'steps', 'expectedAssertions'],
            },
          },
        },
        required: ['scenarios'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_grounded_scenarios',
      description: 'Generate structured test scenarios directly grounded in the solution Dataverse metadata and markdown documentation.',
      parameters: {
        type: 'object',
        properties: {
          focusArea: {
            type: 'string',
            enum: ['all', 'entity_crud', 'relationships', 'cloud_flows', 'copilot_agent', 'custom'],
            description: 'Focus area for the generated test scenarios',
          },
          targetAppType: {
            type: 'string',
            enum: ['model_driven', 'canvas', 'copilot'],
            description: 'Target Power Platform application architecture',
          },
          targetAppName: {
            type: 'string',
            description: 'Name of the Model-Driven App or Copilot bot',
          },
          prompt: {
            type: 'string',
            description: 'Custom instructions or specific scenarios to verify',
          },
          solutionId: {
            type: 'string',
            description: 'Solution ID to ground the scenarios in',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'synthesize_playwright_test',
      description: 'Synthesize an executable TypeScript Playwright test suite from scenario definitions using Microsoft Power Platform Page Object Model templates.',
      parameters: {
        type: 'object',
        properties: {
          suiteTitle: {
            type: 'string',
            description: 'Title of the test suite',
          },
          targetAppType: {
            type: 'string',
            enum: ['model_driven', 'canvas', 'copilot'],
            description: 'Target application type',
          },
          targetAppName: {
            type: 'string',
            description: 'Target application name',
          },
          scenarios: {
            type: 'array',
            description: 'List of test scenarios to synthesize',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                steps: { type: 'array', items: { type: 'string' } },
                expectedAssertions: { type: 'array', items: { type: 'string' } },
              },
              required: ['title', 'steps', 'expectedAssertions'],
            },
          },
          solutionId: {
            type: 'string',
            description: 'Optional solution ID for metadata schema grounding',
          },
        },
        required: ['suiteTitle', 'scenarios'],
      },
    },
  },
];

export async function executeAgentTool(
  toolName: string,
  args: any,
  userId: string,
  defaultSolutionId?: string
): Promise<any> {
  const solId = args.solutionId || defaultSolutionId;

  switch (toolName) {
    case 'search_solution_metadata': {
      const q = (args.queryText || '').toLowerCase();
      let tableSql = `SELECT schema_name, display_name, primary_id_attribute, columns FROM solution_tables`;
      const tableParams: any[] = [];

      if (solId) {
        tableSql += ` WHERE solution_id = $1`;
        tableParams.push(solId);
      }

      const tableRes = await query(tableSql, tableParams);
      const matchedTables = tableRes.rows.filter((r: any) => {
        const nameMatch = r.schema_name?.toLowerCase().includes(q) || r.display_name?.toLowerCase().includes(q);
        const cols = typeof r.columns === 'string' ? JSON.parse(r.columns) : (r.columns || []);
        const colMatch = cols.some((c: any) => c.schemaName?.toLowerCase().includes(q) || c.displayName?.toLowerCase().includes(q));
        return nameMatch || colMatch;
      });

      let flowSql = `SELECT name, trigger_type, actions, connection_references FROM solution_flows`;
      const flowParams: any[] = [];
      if (solId) {
        flowSql += ` WHERE solution_id = $1`;
        flowParams.push(solId);
      }
      const flowRes = await query(flowSql, flowParams);
      const matchedFlows = flowRes.rows.filter((r: any) => {
        return r.name?.toLowerCase().includes(q) || r.trigger_type?.toLowerCase().includes(q);
      });

      let botSql = `SELECT bot_schema_name, display_name, topics FROM solution_copilot_bots`;
      const botParams: any[] = [];
      if (solId) {
        botSql += ` WHERE solution_id = $1`;
        botParams.push(solId);
      }
      const botRes = await query(botSql, botParams);
      const matchedBots = botRes.rows.filter((r: any) => {
        const bMatch = r.bot_schema_name?.toLowerCase().includes(q) || r.display_name?.toLowerCase().includes(q);
        const topics = typeof r.topics === 'string' ? JSON.parse(r.topics) : (r.topics || []);
        const topicMatch = topics.some((t: any) =>
          t.displayName?.toLowerCase().includes(q) ||
          (t.triggerPhrases && t.triggerPhrases.some((tp: string) => tp.toLowerCase().includes(q)))
        );
        return bMatch || topicMatch;
      });

      return {
        query: q,
        matchedTables: matchedTables.map((t: any) => ({
          schemaName: t.schema_name,
          displayName: t.display_name,
          columnCount: (typeof t.columns === 'string' ? JSON.parse(t.columns) : t.columns || []).length,
        })),
        matchedFlows: matchedFlows.map((f: any) => ({
          name: f.name,
          triggerType: f.trigger_type,
        })),
        matchedBots: matchedBots.map((b: any) => ({
          displayName: b.display_name,
          schema: b.bot_schema_name,
        })),
      };
    }

    case 'get_component_details': {
      const { componentType, componentName } = args;
      const targetName = (componentName || '').toLowerCase();

      if (componentType === 'table') {
        const res = await query(
          `SELECT * FROM solution_tables WHERE (LOWER(schema_name) = $1 OR LOWER(display_name) = $1) ${solId ? 'AND solution_id = $2' : ''} LIMIT 1`,
          solId ? [targetName, solId] : [targetName]
        );
        if (res.rows.length === 0) return { error: `Table '${componentName}' not found` };
        return res.rows[0];
      }

      if (componentType === 'flow') {
        const res = await query(
          `SELECT * FROM solution_flows WHERE LOWER(name) LIKE $1 ${solId ? 'AND solution_id = $2' : ''} LIMIT 1`,
          solId ? [`%${targetName}%`, solId] : [`%${targetName}%`]
        );
        if (res.rows.length === 0) return { error: `Flow '${componentName}' not found` };
        return res.rows[0];
      }

      if (componentType === 'bot') {
        const res = await query(
          `SELECT * FROM solution_copilot_bots WHERE (LOWER(bot_schema_name) = $1 OR LOWER(display_name) = $1) ${solId ? 'AND solution_id = $2' : ''} LIMIT 1`,
          solId ? [targetName, solId] : [targetName]
        );
        if (res.rows.length === 0) return { error: `Copilot Bot '${componentName}' not found` };
        return res.rows[0];
      }

      return { error: `Unsupported component type: ${componentType}` };
    }

    case 'read_markdown_section': {
      const section = (args.sectionTitle || '').toLowerCase();
      let mdSql = 'SELECT markdown_content FROM solutions';
      const mdParams: any[] = [];
      if (solId) {
        mdSql += ' WHERE id = $1';
        mdParams.push(solId);
      } else {
        mdSql += ' ORDER BY updated_at DESC LIMIT 1';
      }

      const res = await query(mdSql, mdParams);
      if (res.rows.length === 0 || !res.rows[0].markdown_content) {
        return { content: 'No markdown documentation available.' };
      }

      const fullMd = res.rows[0].markdown_content as string;
      const sections = fullMd.split(/(?=^##\s)/m);
      const matched = sections.find(s => s.toLowerCase().includes(section));

      return {
        section: args.sectionTitle,
        content: matched || fullMd.slice(0, 1500) + '\n\n...(truncated)',
      };
    }

    case 'propose_test_scenarios': {
      const scenarios = args.scenarios || [];
      return {
        proposedCount: scenarios.length,
        scenarios: scenarios.map((s: any, idx: number) => ({
          ...s,
          id: `scenario-${Date.now()}-${idx}`,
        })),
        message: `Successfully generated ${scenarios.length} test scenario cards. You can review and compile them into Playwright specs.`,
      };
    }

    case 'generate_grounded_scenarios': {
      // Dynamically import TestSuiteService to avoid circular dependency
      const { TestSuiteService } = await import('../testSuite.service');
      const targetSolId = solId;
      if (!targetSolId) {
        return { error: 'solutionId is required to generate grounded scenarios' };
      }
      const scenarios = await TestSuiteService.generateScenariosForSolution(
        targetSolId,
        {
          focusArea: args.focusArea,
          targetAppType: args.targetAppType,
          targetAppName: args.targetAppName,
          prompt: args.prompt,
        },
        userId
      );
      return {
        solutionId: targetSolId,
        count: scenarios.length,
        scenarios,
        message: `Generated ${scenarios.length} grounded scenarios from solution metadata.`,
      };
    }

    case 'synthesize_playwright_test': {
      const { synthesizePlaywrightTestSuite } = await import('../testgen/testSynthesizer');
      const code = synthesizePlaywrightTestSuite({
        suiteTitle: args.suiteTitle || 'Agentic Test Suite',
        targetAppType: args.targetAppType || 'model_driven',
        targetAppName: args.targetAppName,
        scenarios: args.scenarios || [],
      });
      return {
        suiteTitle: args.suiteTitle,
        codeLength: code.length,
        generatedCode: code,
        message: 'Successfully synthesized Playwright TypeScript test suite using Microsoft Page Object Models.',
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

