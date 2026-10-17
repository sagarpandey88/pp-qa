import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth.service';
import { TestSuiteService } from '../services/testSuite.service';
import { synthesizePlaywrightTestSuite } from '../services/testgen/testSynthesizer';
import { AgenticSynthesizer } from '../services/testgen/agenticSynthesizer';
import { AgenticCodeModifier } from '../services/testgen/agenticCodeModifier';

const router = Router();

/**
 * GET /api/test-suites
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { solutionId } = req.query;
    const suites = await TestSuiteService.listSuites(solutionId as string);
    res.json(suites);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list test suites' });
  }
});

/**
 * POST /api/test-suites/generate-scenarios
 * AI Scenario Generation grounded in solution metadata and markdown
 */
router.post('/generate-scenarios', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { solutionId, focusArea, prompt, targetAppType, targetAppName, provider, model } = req.body;

    if (!solutionId) {
      res.status(400).json({ error: 'solutionId is required to generate scenarios' });
      return;
    }

    const scenarios = await TestSuiteService.generateScenariosForSolution(
      solutionId,
      { focusArea, prompt, targetAppType, targetAppName, provider, model },
      userId
    );

    res.json({ success: true, scenarios });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate test scenarios' });
  }
});

/**
 * POST /api/test-suites/synthesize-preview
 * Previews synthesized Playwright TypeScript code without persisting to database
 */
router.post('/synthesize-preview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { suiteTitle, targetAppType, targetAppName, scenarios, solutionId, useAi, provider, model } = req.body;

    const code = await AgenticSynthesizer.synthesize({
      suiteTitle: suiteTitle || 'Preview Test Suite',
      targetAppType: targetAppType || 'model_driven',
      targetAppName,
      scenarios: scenarios || [],
      solutionId,
      userId,
      useAi,
      provider,
      model,
    });

    res.json({ success: true, code });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to preview test code synthesis' });
  }
});

/**
 * POST /api/test-suites/modify-code
 * AI-powered modification and issue fixing for Playwright test scripts (in-memory preview)
 */
router.post('/modify-code', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code, instruction, errorLog, suiteTitle, targetAppType, targetAppName, solutionId, provider, model } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Playwright test code is required' });
      return;
    }

    if (!instruction) {
      res.status(400).json({ error: 'Modification instruction or issue description is required' });
      return;
    }

    const result = await AgenticCodeModifier.modifyCode({
      code,
      instruction,
      errorLog,
      suiteTitle,
      targetAppType,
      targetAppName,
      solutionId,
      userId,
      provider,
      model,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to modify test script' });
  }
});


/**
 * POST /api/test-suites
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { solutionId, title, description, targetAppType, targetAppName, scenarios } = req.body;

    if (!title || !targetAppType) {
      res.status(400).json({ error: 'Title and targetAppType are required' });
      return;
    }

    const suite = await TestSuiteService.createSuite(
      solutionId,
      title,
      description || '',
      targetAppType,
      targetAppName || 'Model Driven App',
      scenarios || []
    );

    res.status(201).json(suite);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create test suite' });
  }
});

/**
 * GET /api/test-suites/:id
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const suite = await TestSuiteService.getSuite(id);
    if (!suite) {
      res.status(404).json({ error: 'Test suite not found' });
      return;
    }
    res.json(suite);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get test suite' });
  }
});

/**
 * PUT /api/test-suites/:id
 */
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updated = await TestSuiteService.updateSuite(id, req.body, {
      userId,
      useAi: req.body.useAi,
      provider: req.body.provider,
      model: req.body.model,
    });
    if (!updated) {
      res.status(404).json({ error: 'Test suite not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update test suite' });
  }
});

/**
 * POST /api/test-suites/:id/synthesize
 * Force re-synthesis of TypeScript Playwright test suite code with AI reasoning or deterministic compiler
 */
router.post('/:id/synthesize', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { useAi, provider, model } = req.body;
    const suite = await TestSuiteService.getSuite(id);
    if (!suite) {
      res.status(404).json({ error: 'Test suite not found' });
      return;
    }

    const code = await AgenticSynthesizer.synthesize({
      suiteTitle: suite.title,
      targetAppType: suite.targetAppType,
      targetAppName: suite.targetAppName,
      scenarios: suite.scenarios,
      solutionId: suite.solutionId,
      userId,
      useAi,
      provider,
      model,
    });

    const updated = await TestSuiteService.updateSuite(id, { generatedCode: code });
    res.json({ success: true, code, suite: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to synthesize test suite code' });
  }
});

/**
 * POST /api/test-suites/:id/modify-code
 * Modifies synthesized Playwright test script for an existing suite with AI assistant
 */
router.post('/:id/modify-code', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { code, instruction, errorLog, provider, model, autoSave } = req.body;

    const suite = await TestSuiteService.getSuite(id);
    if (!suite) {
      res.status(404).json({ error: 'Test suite not found' });
      return;
    }

    const scriptCode = code || suite.generatedCode;
    if (!scriptCode) {
      res.status(400).json({ error: 'No test code available to modify. Please synthesize code first.' });
      return;
    }

    if (!instruction) {
      res.status(400).json({ error: 'Modification instruction or issue description is required.' });
      return;
    }

    const result = await AgenticCodeModifier.modifyCode({
      code: scriptCode,
      instruction,
      errorLog,
      suiteTitle: suite.title,
      targetAppType: suite.targetAppType,
      targetAppName: suite.targetAppName,
      solutionId: suite.solutionId,
      userId,
      provider,
      model,
    });

    let updatedSuite = suite;
    if (autoSave !== false) {
      const updated = await TestSuiteService.updateSuite(id, {
        generatedCode: result.modifiedCode,
        preserveCode: true,
      });
      if (updated) {
        updatedSuite = updated;
      }
    }

    res.json({
      success: true,
      modifiedCode: result.modifiedCode,
      explanation: result.explanation,
      changes: result.changes,
      suite: updatedSuite,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to modify test suite code' });
  }
});


/**
 * DELETE /api/test-suites/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await TestSuiteService.deleteSuite(id);
    if (!deleted) {
      res.status(404).json({ error: 'Test suite not found' });
      return;
    }
    res.json({ message: 'Test suite deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete test suite' });
  }
});

export default router;

