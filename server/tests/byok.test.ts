import { initDb, closeDb } from '../src/db/pool';
import { ByokService } from '../src/services/ai/byok.service';
import { executeAgentTool } from '../src/services/ai/agent.tools';
import { findOrCreateUser } from '../src/services/auth.service';

describe('Phase 4: Multi-Model BYOK & Agent Tools', () => {
  let userId: string;

  beforeAll(async () => {
    await initDb();
    const user = await findOrCreateUser('byok-tester@contoso.com', 'BYOK Tester');
    userId = user.id;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should encrypt and save OpenAI and Gemini API keys', async () => {
    const openaiKey = 'sk-proj-1234567890abcdef1234567890';
    const geminiKey = 'AIzaSyFakeGeminiApiKey123456789';

    const savedOpenai = await ByokService.saveKey(userId, 'openai', openaiKey);
    expect(savedOpenai.isConfigured).toBe(true);
    expect(savedOpenai.keyHint).toBe('sk-p...7890');

    const savedGemini = await ByokService.saveKey(userId, 'gemini', geminiKey);
    expect(savedGemini.isConfigured).toBe(true);
    expect(savedGemini.keyHint).toBe('AIza...6789');
  });

  it('should retrieve decrypted keys from the vault', async () => {
    const openaiKey = await ByokService.getKey(userId, 'openai');
    expect(openaiKey).toBe('sk-proj-1234567890abcdef1234567890');

    const geminiKey = await ByokService.getKey(userId, 'gemini');
    expect(geminiKey).toBe('AIzaSyFakeGeminiApiKey123456789');
  });

  it('should list configured keys without exposing raw plaintext', async () => {
    const list = await ByokService.listKeys(userId);
    expect(list.length).toBe(3);

    const openaiInfo = list.find(k => k.provider === 'openai');
    expect(openaiInfo?.isConfigured).toBe(true);
    expect(openaiInfo?.keyHint).toContain('...');
    expect(openaiInfo?.keyHint).not.toBe('sk-proj-1234567890abcdef1234567890');
  });

  it('should save, retrieve and manage Azure OpenAI configuration', async () => {
    const azureKey = '1234567890abcdef1234567890abcdef';
    const endpoint = 'https://contoso-qa.openai.azure.com';
    const deployment = 'gpt-4o';

    const saved = await ByokService.saveKey(userId, 'azure_openai', azureKey, {
      endpoint,
      deployment,
      apiVersion: '2024-06-01',
    });

    expect(saved.isConfigured).toBe(true);
    expect(saved.provider).toBe('azure_openai');
    expect(saved.keyHint).toContain('contoso-qa.openai.azure.com');

    // Retrieve Azure OpenAI config
    const retrieved = await ByokService.getAzureOpenAiConfig(userId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.apiKey).toBe(azureKey);
    expect(retrieved?.endpoint).toBe(endpoint);
    expect(retrieved?.deployment).toBe(deployment);

    // Verify list keys includes Azure OpenAI
    const list = await ByokService.listKeys(userId);
    const azureInfo = list.find(k => k.provider === 'azure_openai');
    expect(azureInfo?.isConfigured).toBe(true);
    expect(azureInfo?.endpoint).toBe(endpoint);

    // Delete Azure OpenAI key
    const deleted = await ByokService.deleteKey(userId, 'azure_openai');
    expect(deleted).toBe(true);

    const listAfterDelete = await ByokService.listKeys(userId);
    const azureAfter = listAfterDelete.find(k => k.provider === 'azure_openai');
    expect(azureAfter?.isConfigured).toBe(false);
  });

  it('should execute search_solution_metadata tool', async () => {
    const res = await executeAgentTool('search_solution_metadata', { queryText: 'account' }, userId);
    expect(res).toBeDefined();
    expect(res.query).toBe('account');
    expect(Array.isArray(res.matchedTables)).toBe(true);
  });

  it('should execute propose_test_scenarios tool and return structured scenarios', async () => {
    const scenarios = [
      {
        title: 'Create Account Record',
        targetAppType: 'model_driven',
        targetAppName: 'Sales Hub',
        steps: ['Click + New', 'Enter Account Name', 'Save & Close'],
        expectedAssertions: ['Form saves', 'Record listed in grid'],
      },
    ];

    const res = await executeAgentTool('propose_test_scenarios', { scenarios }, userId);
    expect(res.proposedCount).toBe(1);
    expect(res.scenarios[0].id).toBeDefined();
    expect(res.scenarios[0].title).toBe('Create Account Record');
  });

  it('should delete a key from the vault', async () => {
    const deleted = await ByokService.deleteKey(userId, 'gemini');
    expect(deleted).toBe(true);

    const list = await ByokService.listKeys(userId);
    const geminiInfo = list.find(k => k.provider === 'gemini');
    expect(geminiInfo?.isConfigured).toBe(false);
  });
});

