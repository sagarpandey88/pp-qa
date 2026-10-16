import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth.service';
import { ByokService, AiProvider } from '../services/ai/byok.service';
import { testAzureOpenAiConnection } from '../services/ai/openai.client';
import { config } from '../config/env';

const router = Router();

/**
 * GET /api/byok
 * List configured BYOK keys (masked)
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const keys = await ByokService.listKeys(userId);
    res.json(keys);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list BYOK keys' });
  }
});

/**
 * POST /api/byok
 * Save a new encrypted OpenAI, Azure OpenAI, or Gemini API key
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { provider, apiKey, endpoint, deployment, apiVersion } = req.body;

    if (!provider || !apiKey) {
      res.status(400).json({ error: 'Provider and apiKey are required' });
      return;
    }

    const validProviders: AiProvider[] = ['openai', 'azure_openai', 'gemini'];
    if (!validProviders.includes(provider)) {
      res.status(400).json({ error: 'Provider must be "openai", "azure_openai", or "gemini"' });
      return;
    }

    if (provider === 'azure_openai') {
      const resolvedEndpoint = endpoint || config.AZURE_OPENAI_ENDPOINT;
      if (!resolvedEndpoint) {
        res.status(400).json({
          error: 'Azure OpenAI Endpoint (e.g. https://<resource>.openai.azure.com/) is required',
        });
        return;
      }
    }

    const saved = await ByokService.saveKey(userId, provider, apiKey, {
      endpoint,
      deployment,
      apiVersion,
    });

    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save BYOK key' });
  }
});

/**
 * POST /api/byok/test
 * Test an Azure OpenAI or OpenAI configuration without saving
 */
router.post('/test', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, apiKey, endpoint, deployment, apiVersion } = req.body;

    if (provider === 'azure_openai') {
      if (!apiKey || !endpoint) {
        res.status(400).json({ success: false, message: 'apiKey and endpoint are required to test Azure OpenAI.' });
        return;
      }
      const testRes = await testAzureOpenAiConnection({
        apiKey,
        endpoint,
        deployment: deployment || 'gpt-4o',
        apiVersion: apiVersion || '2024-06-01',
      });
      res.json(testRes);
      return;
    }

    res.json({ success: true, message: `Provider '${provider}' configuration validated.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Connection test failed' });
  }
});

/**
 * DELETE /api/byok/:provider
 */
router.delete('/:provider', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { provider } = req.params;

    const validProviders: AiProvider[] = ['openai', 'azure_openai', 'gemini'];
    if (!validProviders.includes(provider as AiProvider)) {
      res.status(400).json({ error: 'Invalid provider' });
      return;
    }

    const deleted = await ByokService.deleteKey(userId, provider as AiProvider);
    if (!deleted) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    res.json({ message: 'Key removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete BYOK key' });
  }
});

export default router;
