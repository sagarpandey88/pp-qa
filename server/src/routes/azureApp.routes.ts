import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth.service';
import { AzureAppService } from '../services/azureApp.service';

const router = Router();

/**
 * GET /api/azure-profiles/status
 * Returns onboarding/profile readiness status for current user
 */
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profiles = await AzureAppService.listProfiles(userId);
    const hasDefaultEnv = !!(process.env.DATAVERSE_CLIENT_ID && process.env.DATAVERSE_TENANT_ID);
    const active = profiles.find(p => p.isActive) || profiles[0] || null;
    res.json({
      hasConfiguredProfile: profiles.length > 0 || hasDefaultEnv,
      activeProfile: active ? {
        id: active.id,
        profileName: active.profileName,
        tenantId: active.tenantId,
        clientId: active.clientId,
        environmentUrl: active.environmentUrl,
      } : null,
      hasDefaultEnv,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve profile status' });
  }
});

/**
 * GET /api/azure-profiles
 * List all Azure profiles for current user
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profiles = await AzureAppService.listProfiles(userId);
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list profiles' });
  }
});

/**
 * POST /api/azure-profiles
 * Add or save an Azure App profile
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { profileName, tenantId, clientId, clientSecret, environmentUrl, setActive } = req.body;

    if (!tenantId || !clientId || !clientSecret || !environmentUrl) {
      res.status(400).json({ error: 'Tenant ID, Client ID, Client Secret, and Environment URL are required' });
      return;
    }

    const profile = await AzureAppService.saveProfile(
      userId,
      profileName || 'Default Environment',
      tenantId,
      clientId,
      clientSecret,
      environmentUrl,
      setActive !== false
    );

    res.status(201).json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save Azure profile' });
  }
});

/**
 * PUT /api/azure-profiles/:id/activate
 * Set profile active
 */
router.put('/:id/activate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const success = await AzureAppService.setActive(id, userId);
    if (!success) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ message: 'Profile set to active' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to activate profile' });
  }
});

/**
 * DELETE /api/azure-profiles/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const success = await AzureAppService.deleteProfile(id, userId);
    if (!success) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ message: 'Profile deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete profile' });
  }
});

/**
 * POST /api/azure-profiles/test-connection
 * Validates connection without saving
 */
router.post('/test-connection', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, clientId, clientSecret, environmentUrl } = req.body;
    const result = await AzureAppService.testConnection(
      tenantId || '',
      clientId || '',
      clientSecret || '',
      environmentUrl || ''
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Connection test failed' });
  }
});

export default router;

