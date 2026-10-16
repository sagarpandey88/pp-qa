import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthenticatedRequest } from '../services/auth.service';
import { ExecutionQueue } from '../services/runner/executionQueue';
import { MfaSessionService } from '../services/runner/mfaSessionService';
import { config } from '../config/env';

const router = Router();

/**
 * GET /api/runs
 * List all test runs
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { testSuiteId } = req.query;
    const runs = await ExecutionQueue.listRuns(testSuiteId as string);
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list test runs' });
  }
});

/**
 * POST /api/runs
 * Queue a new test run for a suite
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { testSuiteId } = req.body;
    if (!testSuiteId) {
      res.status(400).json({ error: 'testSuiteId is required' });
      return;
    }

    const runId = await ExecutionQueue.queueRun(testSuiteId);
    res.status(202).json({
      success: true,
      runId,
      message: 'Test run queued for headless execution',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to queue test run' });
  }
});

/**
 * GET /api/runs/:id
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const run = await ExecutionQueue.getRun(id);
    if (!run) {
      res.status(404).json({ error: 'Test run not found' });
      return;
    }
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve test run' });
  }
});

/**
 * GET /api/runs/:id/logs
 * Real-time SSE streaming log terminal
 */
router.get('/:id/logs', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const unsubscribe = ExecutionQueue.subscribeLogs(
    id,
    (line: string) => {
      res.write(`data: ${JSON.stringify({ line })}\n\n`);
    },
    () => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  );

  req.on('close', () => {
    unsubscribe();
  });
});

/**
 * POST /api/runs/:id/cancel
 */
router.post('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cancelled = ExecutionQueue.cancelRun(id);
    res.json({ success: cancelled });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel test run' });
  }
});

/**
 * DELETE /api/runs/:id
 * Delete a single test run record
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await ExecutionQueue.deleteRun(id);
    if (!deleted) {
      res.status(404).json({ error: 'Test run not found' });
      return;
    }
    res.json({ success: true, message: 'Test run deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete test run' });
  }
});

/**
 * POST /api/runs/delete-batch
 * Batch delete multiple test runs
 */
router.post('/delete-batch', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { runIds } = req.body;
    if (!Array.isArray(runIds) || runIds.length === 0) {
      res.status(400).json({ error: 'runIds array is required' });
      return;
    }

    const count = await ExecutionQueue.deleteRuns(runIds);
    res.json({ success: true, deletedCount: count, message: `${count} test runs deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete test runs' });
  }
});

/**
 * DELETE /api/runs
 * Batch delete multiple test runs
 */
router.delete('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { runIds } = req.body;
    if (!Array.isArray(runIds) || runIds.length === 0) {
      res.status(400).json({ error: 'runIds array is required' });
      return;
    }

    const count = await ExecutionQueue.deleteRuns(runIds);
    res.json({ success: true, deletedCount: count, message: `${count} test runs deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete test runs' });
  }
});

/**
 * GET /api/runs/:id/report
 * Direct access to HTML report file
 */
router.get('/:id/report', (req, res) => {
  const indexHtml = path.resolve(__dirname, '../../../playwright/report/index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(404).send('Playwright HTML report has not been generated yet.');
  }
});

/**
 * GET /api/runs/auth/credentials
 * Retrieve configured test runner login credentials status
 */
router.get('/auth/credentials', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    email: config.MS_AUTH_EMAIL || process.env.MS_AUTH_EMAIL || '',
    hasPassword: !!(config.MS_USER_PASSWORD || process.env.MS_USER_PASSWORD),
    environmentUrl: config.MS_ENVIRONMENT_URL || process.env.MS_ENVIRONMENT_URL || '',
  });
});

/**
 * POST /api/runs/auth/credentials
 * Update test runner login credentials
 */
router.post('/auth/credentials', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, environmentUrl } = req.body;
    if (email !== undefined) {
      config.MS_AUTH_EMAIL = email;
      process.env.MS_AUTH_EMAIL = email;
      process.env.PP_USER_EMAIL = email;
    }
    if (password !== undefined) {
      config.MS_USER_PASSWORD = password;
      process.env.MS_USER_PASSWORD = password;
      process.env.PP_USER_PASSWORD = password;
    }
    if (environmentUrl !== undefined) {
      config.MS_ENVIRONMENT_URL = environmentUrl;
      process.env.MS_ENVIRONMENT_URL = environmentUrl;
      process.env.PP_APP_URL = environmentUrl;
    }

    // Persist to server/.env if file exists
    try {
      const envPath = path.resolve(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        if (email !== undefined) {
          if (content.includes('MS_AUTH_EMAIL=')) {
            content = content.replace(/^MS_AUTH_EMAIL=.*$/m, `MS_AUTH_EMAIL=${email}`);
          } else {
            content += `\nMS_AUTH_EMAIL=${email}`;
          }
        }
        if (password !== undefined && password) {
          if (content.includes('MS_USER_PASSWORD=')) {
            content = content.replace(/^MS_USER_PASSWORD=.*$/m, `MS_USER_PASSWORD=${password}`);
          } else {
            content += `\nMS_USER_PASSWORD=${password}`;
          }
        }
        if (environmentUrl !== undefined) {
          if (content.includes('MS_ENVIRONMENT_URL=')) {
            content = content.replace(/^MS_ENVIRONMENT_URL=.*$/m, `MS_ENVIRONMENT_URL=${environmentUrl}`);
          } else {
            content += `\nMS_ENVIRONMENT_URL=${environmentUrl}`;
          }
        }
        fs.writeFileSync(envPath, content, 'utf8');
      }
    } catch (envErr) {
      console.warn('Could not write credentials to .env file', envErr);
    }

    res.json({
      success: true,
      message: 'Test runner authentication credentials updated successfully',
      email: config.MS_AUTH_EMAIL,
      hasPassword: !!config.MS_USER_PASSWORD,
      environmentUrl: config.MS_ENVIRONMENT_URL,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update credentials' });
  }
});

/**
 * GET /api/runs/auth/session-status
 * Get status of captured Playwright browser session (MFA)
 */
router.get('/auth/session-status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = (req.query.email as string) || config.MS_AUTH_EMAIL;
    const status = MfaSessionService.getStatus(email);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check session status' });
  }
});

/**
 * POST /api/runs/auth/launch-session-capture
 * Launch headed browser for interactive Microsoft sign-in & MFA approval
 */
router.post('/auth/launch-session-capture', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { environmentUrl, email } = req.body;
    const result = await MfaSessionService.launchInteractiveCapture({ environmentUrl, email });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to launch session capture' });
  }
});

/**
 * POST /api/runs/auth/cancel-session-capture
 * Cancel ongoing session capture and close browser
 */
router.post('/auth/cancel-session-capture', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await MfaSessionService.cancelCapture();
    res.json({ success: true, message: 'Session capture cancelled' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel session capture' });
  }
});

/**
 * POST /api/runs/auth/import-session
 * Import storageState JSON directly (for remote or CI environments)
 */
router.post('/auth/import-session', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionData, email } = req.body;
    MfaSessionService.importSession(sessionData, email);
    res.json({ success: true, message: 'Authenticated session imported successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to import session state' });
  }
});

export default router;

