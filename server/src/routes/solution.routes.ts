import { Router, Response } from 'express';
import multer from 'multer';
import { authenticateToken, AuthenticatedRequest } from '../services/auth.service';
import { SolutionService } from '../services/solution.service';
import { extractAndParseSolutionZip } from '../services/parser/zipExtractor';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const router = Router();

/**
 * GET /api/solutions
 * List all imported solutions for the current user
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const list = await SolutionService.listSolutions(userId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list solutions' });
  }
});

/**
 * GET /api/solutions/:id
 * Retrieve solution details including generated Markdown
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const sol = await SolutionService.getSolution(id, userId);
    if (!sol) {
      res.status(404).json({ error: 'Solution not found' });
      return;
    }
    res.json(sol);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve solution' });
  }
});

/**
 * GET /api/solutions/:id/tables
 */
router.get('/:id/tables', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tables = await SolutionService.getSolutionTables(id);
    res.json(tables);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get tables' });
  }
});

/**
 * GET /api/solutions/:id/flows
 */
router.get('/:id/flows', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const flows = await SolutionService.getSolutionFlows(id);
    res.json(flows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get flows' });
  }
});

/**
 * GET /api/solutions/:id/bots
 */
router.get('/:id/bots', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const bots = await SolutionService.getSolutionBots(id);
    res.json(bots);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get bots' });
  }
});

/**
 * POST /api/solutions/upload
 * Manual solution ZIP package upload
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('solutionZip'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ error: 'Please upload a valid solution ZIP file' });
        return;
      }

      const userId = req.user!.id;
      const extracted = extractAndParseSolutionZip(req.file.buffer);
      const solutionId = await SolutionService.saveExtractedSolution(userId, extracted);

      const savedRecord = await SolutionService.getSolution(solutionId, userId);
      res.status(201).json({
        success: true,
        solutionId,
        solution: savedRecord,
        metadata: extracted.metadata,
        markdown: extracted.markdown,
      });
    } catch (err: any) {
      console.error('[SOLUTION UPLOAD ERROR]', err);
      res.status(500).json({ error: err.message || 'Failed to extract and save uploaded solution' });
    }
  }
);

/**
 * DELETE /api/solutions/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const deleted = await SolutionService.deleteSolution(id, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Solution not found' });
      return;
    }
    res.json({ message: 'Solution deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete solution' });
  }
});

export default router;

