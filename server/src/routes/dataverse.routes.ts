import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth.service';
import { DataverseService } from '../services/dataverse.service';
import { extractAndParseSolutionZip } from '../services/parser/zipExtractor';
import { SolutionService } from '../services/solution.service';

const router = Router();

/**
 * GET /api/dataverse/solutions
 * Lists unmanaged solutions available in the active Dataverse environment.
 */
router.get('/solutions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const solutions = await DataverseService.fetchUnmanagedSolutions(userId);
    res.json(solutions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve solutions from Dataverse' });
  }
});

/**
 * POST /api/dataverse/solutions/:uniqueName/export
 * Exports solution ZIP from Dataverse, extracts metadata, generates Markdown, and saves to DB.
 */
router.post('/solutions/:uniqueName/export', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { uniqueName } = req.params;

    console.log(`[DATAVERSE] Exporting solution: ${uniqueName} for user ${userId}...`);
    const zipBuffer = await DataverseService.exportSolution(userId, uniqueName);

    console.log(`[PARSER] Unpacking and parsing solution ZIP (${zipBuffer.length} bytes)...`);
    const extracted = extractAndParseSolutionZip(zipBuffer);

    console.log(`[DB] Saving extracted solution ${extracted.metadata.manifest.friendlyName}...`);
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
    console.error('[DATAVERSE EXPORT ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to export and extract solution' });
  }
});

export default router;

