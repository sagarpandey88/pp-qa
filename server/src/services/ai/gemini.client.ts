import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './prompts';
import { TOOL_DEFINITIONS, executeAgentTool } from './agent.tools';
import { ChatMessage, StreamCallbacks } from './openai.client';

export async function runGeminiChatStream(
  apiKey: string,
  modelName: string,
  messages: ChatMessage[],
  userId: string,
  solutionId?: string,
  callbacks?: StreamCallbacks
): Promise<void> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const targetModel = modelName || 'gemini-2.0-flash';

    // Format chat history
    const contents: any[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiFunctionDeclarations = TOOL_DEFINITIONS.map((td) => ({
      name: td.function.name,
      description: td.function.description,
      parameters: td.function.parameters,
    }));

    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      turns++;
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: geminiFunctionDeclarations as any }],
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        contents.push({
          role: 'model',
          parts: functionCalls.map((fc) => ({ functionCall: fc })),
        });

        const toolResponseParts: any[] = [];
        for (const fc of functionCalls) {
          const toolName = fc.name || '';
          if (!toolName) continue;
          const toolArgs = fc.args || {};

          callbacks?.onToolCall?.(toolName, toolArgs);
          const result = await executeAgentTool(toolName, toolArgs, userId, solutionId);
          callbacks?.onToolResult?.(toolName, result);

          if ((toolName === 'propose_test_scenarios' || toolName === 'generate_grounded_scenarios') && result.scenarios) {
            callbacks?.onScenarioProposal?.(result.scenarios);
          }

          toolResponseParts.push({
            functionResponse: {
              name: toolName,
              response: { output: result },
            },
          });
        }

        contents.push({
          role: 'user',
          parts: toolResponseParts,
        });
      } else {
        if (response.text) {
          callbacks?.onChunk(response.text);
        }
        break;
      }
    }

    callbacks?.onComplete();
  } catch (err: any) {
    console.error('[GEMINI STREAM ERROR]', err);
    callbacks?.onError(err);
  }
}

/**
 * Built-in agent orchestrator for zero-dependency local verification and testing.
 * Directly executes tools against real PostgreSQL database and streams output.
 */
export async function runMockAgentChatStream(
  messages: ChatMessage[],
  userId: string,
  solutionId?: string,
  callbacks?: StreamCallbacks
): Promise<void> {
  const lastMsg = (messages[messages.length - 1]?.content || '').toLowerCase();

  callbacks?.onChunk('Analyzing your Power Platform solution architecture...\n\n');

  // Trigger search_solution_metadata tool
  callbacks?.onToolCall?.('search_solution_metadata', { queryText: 'account', solutionId });
  const searchResult = await executeAgentTool('search_solution_metadata', { queryText: 'account', solutionId }, userId, solutionId);
  callbacks?.onToolResult?.('search_solution_metadata', searchResult);

  if (lastMsg.includes('test') || lastMsg.includes('scenario') || lastMsg.includes('case') || lastMsg.includes('generate')) {
    // Propose test scenarios
    const proposedScenarios = [
      {
        title: 'Create Account Record & Validate Required Fields',
        targetAppType: 'model_driven',
        targetAppName: 'Customer Service Hub',
        preconditions: [
          'Active user session with System Customizer or Sales App role',
          'Navigate to Account entity grid view',
        ],
        steps: [
          'Click "+ New" button on the Model-Driven App command bar',
          'Wait for Account Form to load and ms-spinner dismissal',
          'Fill "Account Name" with "Contoso Global Energy"',
          'Fill "Main Phone" with "+1 (555) 019-2834"',
          'Select "Industry" dropdown value "Consulting"',
          'Click "Save & Close" button on the command bar',
        ],
        expectedAssertions: [
          'Form successfully saves without validation errors',
          'Navigates back to Active Accounts grid view',
          'Grid contains newly created record "Contoso Global Energy"',
        ],
      },
      {
        title: 'Trigger Case Escalation Cloud Flow & Verify SLA Alert',
        targetAppType: 'model_driven',
        targetAppName: 'Customer Service Hub',
        preconditions: [
          'CaseEscalationNotification cloud flow is turned on',
          'Existing active account record exists',
        ],
        steps: [
          'Open active Account record and navigate to Timeline / Cases subgrid',
          'Create high priority Incident record with PriorityCode = 1',
          'Save record to trigger Dataverse row creation event',
          'Wait for Cloud Flow execution run state',
        ],
        expectedAssertions: [
          'Cloud Flow condition Condition_Is_High_Priority evaluates to true',
          'Send_Teams_Alert step completes with HTTP 200 OK',
        ],
      },
      {
        title: 'Verify Support Copilot Agent Generative Answers & Fallback',
        targetAppType: 'copilot',
        targetAppName: 'SupportCopilotAgent',
        preconditions: [
          'Copilot Studio embedded web chat widget initialized',
        ],
        steps: [
          'Send greeting prompt: "Hi, I need help checking my SLA"',
          'Verify conversational response matches PVA Greeting topic',
          'Send query: "What is your enterprise escalation refund policy?"',
          'Wait for Generative Answers node to search knowledge sources',
        ],
        expectedAssertions: [
          'Copilot returns generative response citing enterprise knowledge source',
          'No unhandled topic fallbacks triggered',
        ],
      },
    ];

    callbacks?.onToolCall?.('propose_test_scenarios', { scenarios: proposedScenarios });
    const proposalResult = await executeAgentTool('propose_test_scenarios', { scenarios: proposedScenarios }, userId, solutionId);
    callbacks?.onToolResult?.('propose_test_scenarios', proposalResult);
    callbacks?.onScenarioProposal?.(proposalResult.scenarios);

    callbacks?.onChunk(
      `Based on the extracted solution components, I have analyzed the **Dataverse tables**, **Cloud Flows**, and **Copilot Studio topics**.\n\n` +
      `### Generated Test Scenarios\n` +
      `I have proposed **${proposedScenarios.length} high-fidelity test scenarios** following official Microsoft Power Platform Page Object Model patterns (` +
      `\`ModelDrivenAppPage\`, \`FormComponent\`, \`GridComponent\`, and \`CopilotChatComponent\`).\n\n` +
      `You can review and customize these interactive scenario cards below and compile them directly into executable TypeScript Playwright suites!`
    );
  } else {
    callbacks?.onChunk(
      `I inspected the solution metadata:\n` +
      `- **Dataverse Tables**: Found ${searchResult.matchedTables.length} matching entity tables\n` +
      `- **Cloud Flows**: Found ${searchResult.matchedFlows.length} automated flows\n` +
      `- **Copilot Studio**: Found ${searchResult.matchedBots.length} conversational bots\n\n` +
      `Ask me to **"Generate test scenarios for the Account form and Cloud Flow"** to synthesize test cases!`
    );
  }

  callbacks?.onComplete();
}

