import { initDb, closeDb } from '../src/db/pool';
import { AuthSessionManager } from '../src/services/runner/authSessionManager';
import { ReportCollector } from '../src/services/runner/reportCollector';
import { ExecutionQueue } from '../src/services/runner/executionQueue';
import { TestSuiteService } from '../src/services/testSuite.service';
import { SolutionService } from '../src/services/solution.service';
import { findOrCreateUser } from '../src/services/auth.service';
import { extractAndParseSolutionZip } from '../src/services/parser/zipExtractor';
import { createSampleSolutionZip } from '../src/utils/sampleSolutionZip';
import fs from 'fs';

describe('Phase 6: Playwright Headless Runner & Reporting', () => {
  let suiteId: string;

  beforeAll(async () => {
    await initDb();
    const user = await findOrCreateUser('runner-test@contoso.com', 'Runner Tester');
    const zip = createSampleSolutionZip();
    const extracted = extractAndParseSolutionZip(zip);
    const solutionId = await SolutionService.saveExtractedSolution(user.id, extracted);

    const suite = await TestSuiteService.createSuite(
      solutionId,
      'Runner Verification Suite',
      'Playwright runner execution smoke test',
      'model_driven',
      'Customer Service Hub',
      [
        {
          title: 'Smoke Test Step',
          targetAppType: 'model_driven',
          steps: ['Navigate to app'],
          expectedAssertions: ['App ready'],
        },
      ]
    );
    suiteId = suite.id;
  });

  afterAll(async () => {
    if (suiteId) {
      await TestSuiteService.deleteSuite(suiteId);
    }
    await new Promise(r => setTimeout(r, 300));
    await closeDb();
  });

  it('should generate dual-domain storageState sessions on disk', async () => {
    const session = await AuthSessionManager.getOrCreateSessions('testrunner@contoso.com');
    expect(session.powerAppsSessionPath).toBeDefined();
    expect(session.dataverseSessionPath).toBeDefined();

    expect(fs.existsSync(session.powerAppsSessionPath)).toBe(true);
    expect(fs.existsSync(session.dataverseSessionPath)).toBe(true);

    const paContent = JSON.parse(fs.readFileSync(session.powerAppsSessionPath, 'utf8'));
    expect(Array.isArray(paContent.cookies)).toBe(true);
    expect(paContent.cookies.some((c: any) => c.domain.includes('powerapps'))).toBe(true);
  });

  it('should queue a test run and return runId', async () => {
    const runId = await ExecutionQueue.queueRun(suiteId);
    expect(runId).toBeDefined();

    const run = await ExecutionQueue.getRun(runId);
    expect(run).toBeDefined();
    expect(run.test_suite_id).toBe(suiteId);
  });

  it('should subscribe to live logs for a run', (done) => {
    ExecutionQueue.queueRun(suiteId).then((runId) => {
      let receivedLog = false;

      const unsubscribe = ExecutionQueue.subscribeLogs(
        runId,
        (line) => {
          receivedLog = true;
          expect(typeof line).toBe('string');
        },
        () => {
          unsubscribe();
          expect(receivedLog).toBe(true);
          done();
        }
      );
    });
  });

  it('should collect artifacts and summarize results', () => {
    const { artifacts } = ReportCollector.collectArtifacts('test-run-1');
    expect(Array.isArray(artifacts)).toBe(true);

    const summary = ReportCollector.parseResultsSummary();
    expect(summary).toBeDefined();
    expect(summary.total).toBeGreaterThanOrEqual(1);
  });

  it('should delete a single test run', async () => {
    const runId = await ExecutionQueue.queueRun(suiteId);
    expect(runId).toBeDefined();

    const deleted = await ExecutionQueue.deleteRun(runId);
    expect(deleted).toBe(true);

    const fetched = await ExecutionQueue.getRun(runId);
    expect(fetched).toBeNull();
  });

  it('should batch delete multiple test runs', async () => {
    const runId1 = await ExecutionQueue.queueRun(suiteId);
    const runId2 = await ExecutionQueue.queueRun(suiteId);

    const count = await ExecutionQueue.deleteRuns([runId1, runId2]);
    expect(count).toBe(2);

    const fetched1 = await ExecutionQueue.getRun(runId1);
    const fetched2 = await ExecutionQueue.getRun(runId2);
    expect(fetched1).toBeNull();
    expect(fetched2).toBeNull();
  });
});
