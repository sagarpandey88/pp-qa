import { initDb, closeDb } from '../src/db/pool';
import { createSampleSolutionZip } from './helpers/sampleSolutionZip';
import { extractAndParseSolutionZip } from '../src/services/parser/zipExtractor';
import { SolutionService } from '../src/services/solution.service';
import { findOrCreateUser } from '../src/services/auth.service';

describe('Phase 3: Solution Extraction & Parser Tests', () => {
  let userId: string;

  beforeAll(async () => {
    await initDb();
    const user = await findOrCreateUser('parser-tester@contoso.com', 'Parser Tester');
    userId = user.id;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should generate a valid sample solution ZIP in-memory', () => {
    const zipBuffer = createSampleSolutionZip();
    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(100);
  });

  it('should unpack and parse all XML and JSON components from the solution ZIP', () => {
    const zipBuffer = createSampleSolutionZip();
    const result = extractAndParseSolutionZip(zipBuffer);

    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();

    // Verify manifest
    const manifest = result.metadata.manifest;
    expect(manifest.uniqueName).toBe('CustomerCaseAutomation');
    expect(manifest.friendlyName).toBe('Customer Case & Service Automation');
    expect(manifest.version).toBe('1.2.0.4');
    expect(manifest.publisher.customizationPrefix).toBe('ctg');

    // Verify tables
    const tables = result.metadata.tables;
    expect(tables.length).toBeGreaterThanOrEqual(1);
    const accountTable = tables.find(t => t.schemaName === 'account');
    expect(accountTable).toBeDefined();
    expect(accountTable?.primaryIdAttribute).toBe('accountid');

    // Verify attributes
    const nameCol = accountTable?.columns.find(c => c.schemaName === 'name');
    expect(nameCol?.requiredLevel).toBe('required');
    expect(nameCol?.maxLength).toBe(160);

    const industryCol = accountTable?.columns.find(c => c.schemaName === 'industrycode');
    expect(industryCol?.type).toBe('picklist');
    expect(industryCol?.options?.length).toBe(3);

    // Verify flows
    const flows = result.metadata.flows;
    expect(flows.length).toBeGreaterThanOrEqual(1);
    expect(flows[0].triggerType).toBe('Dataverse Event');
    expect(flows[0].actions.length).toBe(2);

    // Verify bots
    const bots = result.metadata.bots;
    expect(bots.length).toBeGreaterThanOrEqual(1);
    expect(bots[0].topics.length).toBeGreaterThanOrEqual(1);

    // Verify markdown documentation
    expect(result.markdown).toContain('# Solution Specification: Customer Case & Service Automation');
    expect(result.markdown).toContain('## 2. Data Dictionary & Dataverse Tables');
    expect(result.markdown).toContain('## 3. Entity Relationship Diagram (ERD)');
    expect(result.markdown).toContain('## 6. Playwright QA Readiness Matrix');
  });

  it('should persist parsed solution, tables, flows, and bots to PostgreSQL', async () => {
    const zipBuffer = createSampleSolutionZip();
    const result = extractAndParseSolutionZip(zipBuffer);

    const solutionId = await SolutionService.saveExtractedSolution(userId, result);
    expect(solutionId).toBeDefined();

    const list = await SolutionService.listSolutions(userId);
    expect(list.length).toBeGreaterThan(0);
    const found = list.find((s: any) => s.id === solutionId);
    expect(found.unique_name).toBe('CustomerCaseAutomation');
    expect(parseInt(found.table_count, 10)).toBeGreaterThanOrEqual(1);
    expect(parseInt(found.flow_count, 10)).toBeGreaterThanOrEqual(1);

    const tables = await SolutionService.getSolutionTables(solutionId);
    expect(tables.length).toBeGreaterThanOrEqual(1);

    const flows = await SolutionService.getSolutionFlows(solutionId);
    expect(flows.length).toBeGreaterThanOrEqual(1);

    const bots = await SolutionService.getSolutionBots(solutionId);
    expect(bots.length).toBeGreaterThanOrEqual(1);
  });
});

