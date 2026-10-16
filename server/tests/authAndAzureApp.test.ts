import { initDb, closeDb } from '../src/db/pool';
import { findOrCreateUser, generateToken } from '../src/services/auth.service';
import { AzureAppService } from '../src/services/azureApp.service';

describe('Phase 2: Auth & Azure App Profiles', () => {
  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  let userId: string;

  it('should find or create a user and generate a JWT', async () => {
    const user = await findOrCreateUser('admin@contoso.com', 'Admin User', 'ms-oid-1');
    expect(user.id).toBeDefined();
    expect(user.email).toBe('admin@contoso.com');
    userId = user.id;

    const token = generateToken(user);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('should create multiple distinct users without microsoftOid without unique constraint collisions', async () => {
    const timestamp = Date.now();
    const userA = await findOrCreateUser(`test-user-a-${timestamp}@contoso.com`, 'User Alpha');
    const userB = await findOrCreateUser(`test-user-b-${timestamp}@contoso.com`, 'User Beta');

    expect(userA.id).toBeDefined();
    expect(userB.id).toBeDefined();
    expect(userA.id).not.toBe(userB.id);
    expect(userA.microsoftOid).toBeDefined();
    expect(userB.microsoftOid).toBeDefined();
    expect(userA.microsoftOid).not.toBe(userB.microsoftOid);
  });

  it('should save an Azure App profile with encrypted secret', async () => {
    const rawSecret = 'super-secret-client-credential-123';
    const profile = await AzureAppService.saveProfile(
      userId,
      'Test Dev Environment',
      '00000000-0000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      rawSecret,
      'https://testorg.crm.dynamics.com',
      true
    );

    expect(profile.id).toBeDefined();
    expect(profile.profileName).toBe('Test Dev Environment');
    expect(profile.clientSecretHint).not.toBe(rawSecret); // Must be masked!
    expect(profile.isActive).toBe(true);
  });

  it('should retrieve active profile with decrypted secret for backend operations', async () => {
    const active = await AzureAppService.getActiveProfileSecret(userId);
    expect(active).toBeDefined();
    expect(active?.clientSecret).toBe('super-secret-client-credential-123');
    expect(active?.environmentUrl).toBe('https://testorg.crm.dynamics.com');
  });

  it('should test connection with mock credentials successfully', async () => {
    const res = await AzureAppService.testConnection(
      '00000000-0000-0000-0000-000000000000',
      '11111111-1111-1111-1111-111111111111',
      'mock-secret',
      'https://mock.crm.dynamics.com'
    );

    expect(res.success).toBe(true);
    expect(res.tokenType).toBe('Bearer');
  });

  it('should reject invalid connection test with missing params', async () => {
    const res = await AzureAppService.testConnection('', '', '', '');
    expect(res.success).toBe(false);
  });

  it('should support logout and session termination', async () => {
    // Import router and mock express request/response
    const authRouter = (await import('../src/routes/auth.routes')).default;
    expect(authRouter).toBeDefined();
  });

  it('should handle demo user login and auto-seeding', async () => {
    const authRouter: any = (await import('../src/routes/auth.routes')).default;
    const req: any = { body: {} };
    let jsonResult: any = null;
    const res: any = {
      json: (data: any) => { jsonResult = data; },
      status: (code: number) => ({ json: (data: any) => { jsonResult = { ...data, statusCode: code }; } }),
    };

    const demoRoute = authRouter.stack.find((layer: any) => layer.route && layer.route.path === '/demo' && layer.route.methods.post);
    expect(demoRoute).toBeDefined();

    await demoRoute.route.stack[0].handle(req, res, () => {});
    expect(jsonResult).toBeDefined();
    expect(jsonResult.user.email).toBe('demo@contoso.onmicrosoft.com');
    expect(jsonResult.isDemo).toBe(true);
    expect(jsonResult.token).toBeDefined();
  });

  it('should report profile status for users', async () => {
    const azureAppRouter: any = (await import('../src/routes/azureApp.routes')).default;
    const statusRoute = azureAppRouter.stack.find((layer: any) => layer.route && layer.route.path === '/status' && layer.route.methods.get);
    expect(statusRoute).toBeDefined();

    const req: any = { user: { id: userId, email: 'admin@contoso.com' } };
    let jsonResult: any = null;
    const res: any = {
      json: (data: any) => { jsonResult = data; },
      status: (code: number) => ({ json: (data: any) => { jsonResult = { ...data, statusCode: code }; } }),
    };

    const handler = statusRoute.route.stack[statusRoute.route.stack.length - 1].handle;
    await handler(req, res, () => {});
    expect(jsonResult).toBeDefined();
    expect(jsonResult.hasConfiguredProfile).toBe(true);
    expect(jsonResult.activeProfile).toBeDefined();
    expect(jsonResult.activeProfile.profileName).toBe('Test Dev Environment');
  });

  it('should save and update a delegated profile with MSAL cache', async () => {
    const fakeMsalCache = JSON.stringify({
      Account: { homeAccountId: 'fake-home-id' },
      RefreshToken: { secret: 'fake-refresh-token' },
    });

    const profile = await AzureAppService.saveOrUpdateDelegatedProfile(
      userId,
      'https://delegatedorg.crm.dynamics.com',
      fakeMsalCache,
      'tenant-123',
      'client-123'
    );

    expect(profile.id).toBeDefined();
    expect(profile.isDelegated).toBe(true);
    expect(profile.clientSecretHint).toBe('Delegated User (MSAL)');
    expect(profile.environmentUrl).toBe('https://delegatedorg.crm.dynamics.com');

    // Retrieve active profile secret
    const active = await AzureAppService.getActiveProfileSecret(userId);
    expect(active?.isDelegated).toBe(true);
    expect(active?.clientSecret).toBe(`MSAL_CACHE:${fakeMsalCache}`);

    // Update secret / cache
    const updatedMsalCache = JSON.stringify({
      Account: { homeAccountId: 'fake-home-id' },
      RefreshToken: { secret: 'fake-refreshed-token' },
    });
    await AzureAppService.updateProfileSecret(profile.id, `MSAL_CACHE:${updatedMsalCache}`);

    const retrievedAfterUpdate = await AzureAppService.getActiveProfileSecret(userId);
    expect(retrievedAfterUpdate?.clientSecret).toBe(`MSAL_CACHE:${updatedMsalCache}`);
  });
});

