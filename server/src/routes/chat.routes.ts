import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth.service';
import { ByokService } from '../services/ai/byok.service';
import { runOpenAiChatStream, runAzureOpenAiChatStream } from '../services/ai/openai.client';
import { runGeminiChatStream, runMockAgentChatStream } from '../services/ai/gemini.client';

const router = Router();

/**
 * POST /api/chat/stream
 * Server-Sent Events (SSE) chat streaming endpoint with multi-model dispatch and tool execution
 * Supports OpenAI, Azure OpenAI Service, and Google Gemini with local mock fallback
 */
router.post('/stream', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { provider, model, messages, solutionId } = req.body;

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const streamCallbacks = {
    onChunk: (chunk: string) => {
      sendEvent('chunk', { text: chunk });
    },
    onToolCall: (toolName: string, args: any) => {
      sendEvent('tool_call', { name: toolName, args });
    },
    onToolResult: (toolName: string, result: any) => {
      sendEvent('tool_result', { name: toolName, result });
    },
    onScenarioProposal: (scenarios: any[]) => {
      sendEvent('scenarios', { scenarios });
    },
    onComplete: () => {
      sendEvent('done', { status: 'completed' });
      res.end();
    },
    onError: (err: Error) => {
      sendEvent('error', { message: err.message });
      res.end();
    },
  };

  try {
    // 1. Explicit Azure OpenAI provider request
    if (provider === 'azure_openai') {
      const azureConfig = await ByokService.getAzureOpenAiConfig(userId);
      if (azureConfig) {
        await runAzureOpenAiChatStream(
          azureConfig,
          model || azureConfig.deployment || 'gpt-4o',
          messages || [],
          userId,
          solutionId,
          streamCallbacks
        );
        return;
      }
    }

    // 2. Standard OpenAI provider request (with smart Azure OpenAI fallback)
    if (provider === 'openai' || !provider) {
      const apiKey = await ByokService.getKey(userId, 'openai');
      if (apiKey) {
        await runOpenAiChatStream(apiKey, model || 'gpt-4o', messages || [], userId, solutionId, streamCallbacks);
        return;
      }

      // If standard OpenAI is not configured, check if user has Azure OpenAI configured
      const azureConfig = await ByokService.getAzureOpenAiConfig(userId);
      if (azureConfig) {
        console.log('[CHAT] Using configured Azure OpenAI for OpenAI request.');
        await runAzureOpenAiChatStream(
          azureConfig,
          model || azureConfig.deployment || 'gpt-4o',
          messages || [],
          userId,
          solutionId,
          streamCallbacks
        );
        return;
      }
    }

    // 3. Gemini provider request
    if (provider === 'gemini') {
      const apiKey = await ByokService.getKey(userId, 'gemini');
      if (apiKey) {
        await runGeminiChatStream(apiKey, model || 'gemini-2.0-flash', messages || [], userId, solutionId, streamCallbacks);
        return;
      }
    }

    // 4. Zero-dependency local mock fallback if no keys configured
    console.log(`[CHAT] No ${provider || 'openai'} API key found in vault. Running simulated expert agent.`);
    await runMockAgentChatStream(messages || [], userId, solutionId, streamCallbacks);
  } catch (err: any) {
    console.error('[CHAT ROUTE ERROR]', err);
    sendEvent('error', { message: err.message || 'Stream processing failed' });
    res.end();
  }
});

export default router;
