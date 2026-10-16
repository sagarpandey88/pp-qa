import { Router, Request, Response } from 'express';
import { findOrCreateUser, generateToken, authenticateToken, AuthenticatedRequest } from '../services/auth.service';

const router = Router();

/**
 * POST /api/auth/login
 * Microsoft Entra ID or Dev Login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, displayName, microsoftOid } = req.body;

    const userEmail = (email && email.trim()) || 'spadmin@contoso.onmicrosoft.com';
    const userName = (displayName && displayName.trim()) || (email ? email.split('@')[0] : 'Dev QA Engineer');
    const userOid = microsoftOid && microsoftOid.trim()
      ? microsoftOid.trim()
      : (userEmail === 'spadmin@contoso.onmicrosoft.com'
          ? '00000000-0000-0000-0000-000000000001'
          : undefined);

    const user = await findOrCreateUser(userEmail, userName, userOid);
    const token = generateToken(user);

    res.json({
      token,
      user,
      message: 'Authentication successful',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

/**
 * POST /api/auth/demo
 * One-click instant login for Demo / Sandbox exploration
 */
router.post('/demo', async (req: Request, res: Response) => {
  try {
    const demoEmail = 'demo@contoso.onmicrosoft.com';
    const demoName = 'Demo QA Engineer';
    const demoOid = '00000000-0000-0000-0000-000000000002';

    const user = await findOrCreateUser(demoEmail, demoName, demoOid);
    const token = generateToken(user);

    // Auto-seed demo workspace if not already populated
    try {
      const { SolutionService } = await import('../services/solution.service');
      const { createSampleSolutionZip } = await import('../utils/sampleSolutionZip');
      const { extractAndParseSolutionZip } = await import('../services/parser/zipExtractor');
      const { TestSuiteService } = await import('../services/testSuite.service');
      const { AzureAppService } = await import('../services/azureApp.service');
      const { query } = await import('../db/pool');

      const existingSolutions = await SolutionService.listSolutions(user.id);
      if (existingSolutions.length === 0) {
        // 1. Seed demo Azure profile
        await AzureAppService.saveProfile(
          user.id,
          'Demo Dataverse Sandbox',
          '00000000-0000-0000-0000-000000000000',
          '11111111-2222-3333-4444-555555555555',
          'mock-demo-secret-key',
          'https://org-demo.crm.dynamics.com',
          true
        );

        // 2. Extract and persist sample solution
        const zipBuffer = createSampleSolutionZip();
        const parsed = await extractAndParseSolutionZip(zipBuffer);
        const solutionId = await SolutionService.saveExtractedSolution(user.id, parsed);

        // 3. Create sample test suite
        const suite = await TestSuiteService.createSuite(
          solutionId,
          'Customer Service Lifecycle & SLA Suite',
          'Automated E2E scenarios verifying Account grids, Case SLA escalation flows, and Copilot Studio resolution bot.',
          'ModelDrivenApp',
          'Customer Service Hub',
          [
            {
              id: 'sc-1',
              title: 'Verify Active Accounts Grid Filtering and Search',
              targetAppType: 'model_driven',
              steps: [
                'Navigate to Customer Service Hub application',
                'Open Accounts site map navigation entity',
                'Verify Active Accounts system view loads with ms-spinner hidden',
                'Search for Contoso in quick search filter',
                'Assert record grid displays at least 1 matching account',
              ],
              expectedAssertions: [
                'Grid row count is greater than 0',
                'Account record status is Active',
              ],
            },
            {
              id: 'sc-2',
              title: 'Create Priority Case & Verify Cloud Flow Escalation',
              targetAppType: 'model_driven',
              steps: [
                'Click New Case button in incident command bar',
                'Fill Case Title: Urgent Outage - High Severity',
                'Set Priority code to High and Customer to Contoso',
                'Save case record and verify save notification',
                'Assert Automated SLA Escalation Flow triggered and case badge updated',
              ],
              expectedAssertions: [
                'Incident ID is generated and visible in header',
                'Escalation status equals Escalated',
              ],
            },
            {
              id: 'sc-3',
              title: 'Validate Copilot Studio Case Resolution Agent',
              targetAppType: 'copilot',
              steps: [
                'Open Copilot side pane chat component',
                'Send message: How do I resolve high severity ticket?',
                'Verify generative response is received within SLA window',
                'Assert suggested escalation KB articles are linked',
              ],
              expectedAssertions: [
                'Copilot response bubble contains resolution workflow steps',
                'Response time is under 5000ms',
              ],
            },
          ]
        );

        // 4. Seed a finished sample test run for immediate visibility in Live Runs
        const sampleLogs = [
          '[10:00:01] [PLAYWRIGHT] Initializing Chromium browser context (dual-domain session)...',
          '[10:00:03] [POM] Navigating to https://org-demo.crm.dynamics.com/main.aspx?appid=00000000-0000-0000-0000-000000000000',
          '[10:00:05] [POM] Waiting for Dataverse ms-spinner overlay to detach...',
          '[10:00:06] [POM] ModelDrivenAppPage: Selecting entity \'account\' from sitemap',
          '[10:00:07] [POM] GridComponent: Quick search filter applied: \'Contoso\'',
          '[10:00:08] [ASSERT] Verified 2 active matching account records displayed.',
          '[10:00:09] [POM] FormComponent: Initiating new case creation for Contoso Global.',
          '[10:00:11] [POM] CloudFlow: Validated Automated SLA Escalation Flow triggered.',
          '[10:00:13] [COPILOT] ChatComponent: Query \'How do I resolve high severity ticket?\' received KB resolution card in 1.4s.',
          '[10:00:14] [STATUS] Test Suite \'Customer Service Lifecycle & SLA Suite\' execution finished: 3 passed (100%).',
        ].join('\n');

        await query(
          `INSERT INTO test_runs
           (test_suite_id, status, duration_ms, summary, logs, report_url, artifacts, started_at, completed_at)
           VALUES ($1, 'passed', 14200, $2, $3, null, '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            suite.id,
            JSON.stringify({
              total: 3,
              passed: 3,
              failed: 0,
              flaky: 0,
              skipped: 0,
              durationMs: 14200,
              suiteTitle: suite.title,
            }),
            sampleLogs,
          ]
        );
      }
    } catch (seedErr: any) {
      console.warn(`[AUTH] Failed to auto-seed demo data: ${seedErr.message}`);
    }

    res.json({
      token,
      user: {
        ...user,
        isDemo: true,
      },
      isDemo: true,
      message: 'Demo session initialized successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start demo session' });
  }
});

/**
 * GET /api/auth/microsoft/status
 * Checks if Microsoft Entra ID credentials are configured in .env
 */
router.get('/microsoft/status', (req: Request, res: Response) => {
  const { config } = require('../config/env');
  res.json({
    isConfigured: !!(config.MS_CLIENT_ID && config.MS_CLIENT_SECRET),
    tenantId: config.MS_TENANT_ID || null,
    clientId: config.MS_CLIENT_ID ? `${config.MS_CLIENT_ID.slice(0, 8)}...` : null,
    environmentUrl: config.MS_ENVIRONMENT_URL || null,
  });
});

interface PkceSession {
  verifier: string;
  redirectUri: string;
  environmentUrl?: string;
  createdAt: number;
}

const pkceStore = new Map<string, PkceSession>();

// Periodically clean up expired PKCE sessions (15 mins TTL)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pkceStore.entries()) {
    if (now - value.createdAt > 15 * 60 * 1000) {
      pkceStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * GET /api/auth/microsoft/login
 * Initiates official Microsoft Entra ID Login Screen redirect with PKCE (RFC 7636)
 * Supports delegated Dataverse access when environmentUrl is provided or configured in .env
 */
router.get('/microsoft/login', async (req: Request, res: Response) => {
  try {
    const { ConfidentialClientApplication, CryptoProvider } = await import('@azure/msal-node');
    const { config } = await import('../config/env');

    if (!config.MS_CLIENT_ID || !config.MS_CLIENT_SECRET) {
      res.status(400).json({
        error: 'Microsoft Entra ID is not configured. Please set MS_CLIENT_ID and MS_CLIENT_SECRET in .env',
      });
      return;
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const redirectUri = config.MS_REDIRECT_URI || `${protocol}://${host}/api/auth/microsoft/callback`;

    // Target environment URL from query parameter or .env default
    const reqEnvUrl = (req.query.environmentUrl as string) || config.MS_ENVIRONMENT_URL || '';
    const cleanEnvUrl = reqEnvUrl ? reqEnvUrl.trim().replace(/\/+$/, '') : '';

    // Generate PKCE codes to satisfy Microsoft Entra ID requirements
    const cryptoProvider = new CryptoProvider();
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();
    const state = cryptoProvider.createNewGuid();

    pkceStore.set(state, {
      verifier,
      redirectUri,
      environmentUrl: cleanEnvUrl,
      createdAt: Date.now(),
    });

    const pca = new ConfidentialClientApplication({
      auth: {
        clientId: config.MS_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${config.MS_TENANT_ID || 'common'}`,
        clientSecret: config.MS_CLIENT_SECRET,
      },
    });

    // Request standard OIDC scopes, offline_access, plus delegated Dataverse user_impersonation
    const scopes = ['openid', 'profile', 'email', 'offline_access'];
    if (cleanEnvUrl) {
      scopes.push(`${cleanEnvUrl}/user_impersonation`);
    }

    const authCodeUrl = await pca.getAuthCodeUrl({
      scopes,
      redirectUri,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      state,
    });

    res.redirect(authCodeUrl);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initialize Microsoft login' });
  }
});

/**
 * GET /api/auth/microsoft/callback
 * Receives authorization code from Microsoft Entra ID and completes login using PKCE verification
 * Persists serialized MSAL token cache for delegated Dataverse queries
 */
router.get('/microsoft/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = (req.query.state as string) || '';
    const clientOrigin = req.headers.referer
      ? new URL(req.headers.referer).origin
      : (process.env.CLIENT_URL || 'http://localhost:5173');

    if (!code) {
      const errorMsg = req.query.error_description || req.query.error || 'Authorization code missing';
      res.redirect(`${clientOrigin}/auth/callback?error=${encodeURIComponent(String(errorMsg))}`);
      return;
    }

    const { ConfidentialClientApplication } = await import('@azure/msal-node');
    const { config } = await import('../config/env');
    const { AzureAppService } = await import('../services/azureApp.service');

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';

    // Retrieve PKCE session by state parameter
    const pkceSession = state ? pkceStore.get(state) : undefined;
    if (state) {
      pkceStore.delete(state);
    }

    const redirectUri = pkceSession?.redirectUri || config.MS_REDIRECT_URI || `${protocol}://${host}/api/auth/microsoft/callback`;
    const codeVerifier = pkceSession?.verifier;
    const environmentUrl = pkceSession?.environmentUrl || config.MS_ENVIRONMENT_URL || '';

    const pca = new ConfidentialClientApplication({
      auth: {
        clientId: config.MS_CLIENT_ID || '',
        authority: `https://login.microsoftonline.com/${config.MS_TENANT_ID || 'common'}`,
        clientSecret: config.MS_CLIENT_SECRET || '',
      },
    });

    const scopes = ['openid', 'profile', 'email', 'offline_access'];
    if (environmentUrl) {
      scopes.push(`${environmentUrl}/user_impersonation`);
    }

    const tokenRequest: any = {
      code,
      scopes,
      redirectUri,
    };
    if (codeVerifier) {
      tokenRequest.codeVerifier = codeVerifier;
    }

    const tokenResponse = await pca.acquireTokenByCode(tokenRequest);

    const claims: any = tokenResponse.idTokenClaims || {};
    const email = (
      claims.preferred_username ||
      claims.email ||
      tokenResponse.account?.username ||
      'user@contoso.onmicrosoft.com'
    ).toLowerCase();
    const displayName = claims.name || tokenResponse.account?.name || email.split('@')[0];
    const oid = claims.oid || claims.sub || tokenResponse.account?.homeAccountId || undefined;

    const user = await findOrCreateUser(email, displayName, oid);
    const token = generateToken(user);

    // If an environmentUrl was targeted, serialize MSAL token cache and update/create Azure profile
    if (environmentUrl) {
      const serializedCache = pca.getTokenCache().serialize();
      await AzureAppService.saveOrUpdateDelegatedProfile(
        user.id,
        environmentUrl,
        serializedCache,
        tokenResponse.tenantId || config.MS_TENANT_ID,
        config.MS_CLIENT_ID
      );
    }

    const profiles = await AzureAppService.listProfiles(user.id);
    const hasDefaultEnv = !!(process.env.DATAVERSE_CLIENT_ID && process.env.DATAVERSE_TENANT_ID);
    const hasProfile = profiles.length > 0 || hasDefaultEnv;

    res.redirect(
      `${clientOrigin}/auth/callback?token=${token}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.displayName)}&hasProfile=${hasProfile}`
    );
  } catch (err: any) {
    console.error('[AUTH] Microsoft callback error:', err);
    const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientOrigin}/auth/callback?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user
 */
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/logout
 * Terminates user session
 */
router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Session terminated successfully' });
});

export default router;

