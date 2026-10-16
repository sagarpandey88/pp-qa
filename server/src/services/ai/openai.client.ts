import OpenAI, { AzureOpenAI } from 'openai';
import { SYSTEM_PROMPT } from './prompts';
import { TOOL_DEFINITIONS, executeAgentTool } from './agent.tools';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onToolCall?: (toolName: string, args: any) => void;
  onToolResult?: (toolName: string, result: any) => void;
  onScenarioProposal?: (scenarios: any[]) => void;
  onComplete: () => void;
  onError: (err: Error) => void;
}

export interface AzureOpenAiConfig {
  apiKey: string;
  endpoint: string;
  deployment?: string;
  apiVersion?: string;
}

async function executeChatCompletionStream(
  client: OpenAI,
  modelOrDeployment: string,
  messages: ChatMessage[],
  userId: string,
  solutionId?: string,
  callbacks?: StreamCallbacks
): Promise<void> {
  const formattedMessages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      turns++;
      const response = await client.chat.completions.create({
        model: modelOrDeployment || 'gpt-4o',
        messages: formattedMessages,
        tools: TOOL_DEFINITIONS as any,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Check if the model decided to execute tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        formattedMessages.push(message);

        for (const tc of message.tool_calls) {
          const toolName = tc.function.name;
          let toolArgs: any = {};
          try {
            toolArgs = JSON.parse(tc.function.arguments);
          } catch (e) {
            toolArgs = {};
          }

          callbacks?.onToolCall?.(toolName, toolArgs);

          const result = await executeAgentTool(toolName, toolArgs, userId, solutionId);
          callbacks?.onToolResult?.(toolName, result);

          if ((toolName === 'propose_test_scenarios' || toolName === 'generate_grounded_scenarios') && result.scenarios) {
            callbacks?.onScenarioProposal?.(result.scenarios);
          }

          formattedMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        // Continue loop to let model call another tool or finalize
      } else {
        // Direct or final text response
        if (message.content) {
          callbacks?.onChunk(message.content);
        }
        break;
      }
    }

    callbacks?.onComplete();
  } catch (err: any) {
    console.error('[OPENAI/AZURE STREAM ERROR]', err);
    callbacks?.onError(err);
  }
}

/**
 * Executes a streaming chat completion using standard OpenAI API
 */
export async function runOpenAiChatStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  userId: string,
  solutionId?: string,
  callbacks?: StreamCallbacks
): Promise<void> {
  const openai = new OpenAI({ apiKey: apiKey.trim() });
  await executeChatCompletionStream(openai, model || 'gpt-4o', messages, userId, solutionId, callbacks);
}

/**
 * Executes a streaming chat completion using Azure OpenAI Service
 */
export async function runAzureOpenAiChatStream(
  azureConfig: AzureOpenAiConfig,
  model: string,
  messages: ChatMessage[],
  userId: string,
  solutionId?: string,
  callbacks?: StreamCallbacks
): Promise<void> {
  let cleanEndpoint = azureConfig.endpoint.trim().replace(/\/+$/, '');
  if (!cleanEndpoint.startsWith('http://') && !cleanEndpoint.startsWith('https://')) {
    cleanEndpoint = `https://${cleanEndpoint}`;
  }

  const deployment = azureConfig.deployment || model || 'gpt-4o';
  const apiVersion = azureConfig.apiVersion || '2024-06-01';

  const azureClient = new AzureOpenAI({
    apiKey: azureConfig.apiKey.trim(),
    endpoint: cleanEndpoint,
    deployment,
    apiVersion,
  });

  await executeChatCompletionStream(azureClient, deployment, messages, userId, solutionId, callbacks);
}

/**
 * Tests connection to an Azure OpenAI deployment with a lightweight ping
 */
export async function testAzureOpenAiConnection(azureConfig: AzureOpenAiConfig): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    let cleanEndpoint = azureConfig.endpoint.trim().replace(/\/+$/, '');
    if (!cleanEndpoint.startsWith('http://') && !cleanEndpoint.startsWith('https://')) {
      cleanEndpoint = `https://${cleanEndpoint}`;
    }

    const deployment = azureConfig.deployment || 'gpt-4o';
    const apiVersion = azureConfig.apiVersion || '2024-06-01';

    const client = new AzureOpenAI({
      apiKey: azureConfig.apiKey.trim(),
      endpoint: cleanEndpoint,
      deployment,
      apiVersion,
      timeout: 10000,
    });

    const res = await client.chat.completions.create({
      model: deployment,
      messages: [{ role: 'user', content: 'Say hello in 1 word' }],
    });

    const reply = res.choices[0]?.message?.content?.trim() || 'OK';
    return {
      success: true,
      message: `Successfully connected to Azure OpenAI deployment '${deployment}' at ${cleanEndpoint}! Response: "${reply}"`,
    };
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error?.message ||
      err.error?.message ||
      err.message ||
      'Validation failed';
    return {
      success: false,
      message: `Azure OpenAI validation failed: ${errorMsg}`,
    };
  }
}

