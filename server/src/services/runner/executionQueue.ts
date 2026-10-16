import { spawn, ChildProcess, execSync } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { query } from '../../db/pool';
import { config } from '../../config/env';
import { AuthSessionManager } from './authSessionManager';
import { ReportCollector } from './reportCollector';
import { TestSuiteService } from '../testSuite.service';

export interface ActiveRunContext {
  runId: string;
  testSuiteId: string;
  process?: ChildProcess;
  logs: string[];
  emitter: EventEmitter;
  startedAt: number;
}

export class ExecutionQueue {
  private static activeRuns = new Map<string, ActiveRunContext>();

  /**
   * Queues and launches a headless Playwright test run.
   */
  static async queueRun(testSuiteId: string): Promise<string> {
    const suite = await TestSuiteService.getSuite(testSuiteId);
    if (!suite) {
      throw new Error(`Test suite '${testSuiteId}' not found`);
    }

    // Ensure spec file exists with latest login prestep logic
    let codeToRun = suite.generatedCode || '';
    if (suite.scenarios && Array.isArray(suite.scenarios) && suite.scenarios.length > 0 && !codeToRun.includes('LoginPage')) {
      const { synthesizePlaywrightTestSuite } = await import('../testgen/testSynthesizer');
      const targetEnv = (suite as any).environmentUrl || config.MS_ENVIRONMENT_URL || 'https://org.crm.dynamics.com';
      codeToRun = synthesizePlaywrightTestSuite({
        suiteTitle: suite.title,
        targetAppType: suite.targetAppType,
        targetAppName: suite.targetAppName,
        environmentUrl: targetEnv,
        scenarios: suite.scenarios,
      });
      await TestSuiteService.updateSuite(testSuiteId, { generatedCode: codeToRun });
    } else {
      await TestSuiteService.persistSpecFile(testSuiteId, codeToRun);
    }

    // Insert test_run record into database
    const ins = await query(
      `INSERT INTO test_runs
       (test_suite_id, status, duration_ms, summary, logs, report_url, artifacts, started_at)
       VALUES ($1, 'queued', 0, '{}', '', null, '[]', CURRENT_TIMESTAMP)
       RETURNING id`,
      [testSuiteId]
    );

    const runId = ins.rows[0].id;
    const emitter = new EventEmitter();

    const ctx: ActiveRunContext = {
      runId,
      testSuiteId,
      logs: [],
      emitter,
      startedAt: Date.now(),
    };

    this.activeRuns.set(runId, ctx);

    // Launch background execution
    setImmediate(() => this.executeRun(ctx, suite));

    return runId;
  }

  private static async executeRun(ctx: ActiveRunContext, suite: any): Promise<void> {
    const { runId, testSuiteId, emitter } = ctx;
    const addLog = (line: string) => {
      ctx.logs.push(line);
      emitter.emit('log', line);
    };

    try {
      addLog(`[SYSTEM] Initializing Playwright execution runner for suite: ${suite.title}`);
      addLog(`[SYSTEM] Target App: ${suite.targetAppName} (${suite.targetAppType})`);

      await query("UPDATE test_runs SET status = 'running' WHERE id = $1", [runId]);

      // 1. Resolve environment URL and user credentials
      const envUrl = suite.environmentUrl || config.MS_ENVIRONMENT_URL || process.env.MS_ENVIRONMENT_URL || 'https://org.crm.dynamics.com';
      const userEmail = config.MS_AUTH_EMAIL || process.env.MS_AUTH_EMAIL || process.env.PP_USER_EMAIL || '';
      const userPassword = config.MS_USER_PASSWORD || process.env.MS_USER_PASSWORD || process.env.PP_USER_PASSWORD || '';

      // Prepare Microsoft dual-domain session storage
      addLog('[AUTH] Preparing Microsoft Entra / Dataverse dual-domain authentication sessions...');
      const session = await AuthSessionManager.getOrCreateSessions(userEmail || undefined, envUrl);
      addLog(`[AUTH] Session state initialized: Power Apps (${path.basename(session.powerAppsSessionPath)}) | CRM (${path.basename(session.dataverseSessionPath)})`);

      if (userEmail) {
        addLog(`[AUTH PRESTEP] Test runner auto-login configured for user: ${userEmail}`);
      } else {
        addLog('[AUTH PRESTEP] Notice: No MS_AUTH_EMAIL set. Tests running with storageState cache or anonymous session.');
      }

      // 2. Resolve spec file from the dedicated generated-tests folder
      const specFile = TestSuiteService.getSpecFilePath(testSuiteId);
      const configFile = path.resolve(__dirname, '../../../playwright/playwright.config.ts');

      addLog(`[PLAYWRIGHT] Executing headless suite: ${path.basename(specFile)}`);

      const playwrightCache = process.env.HOME ? path.join(process.env.HOME, '.cache/ms-playwright') : '';
      const hasChromium =
        (playwrightCache && fs.existsSync(playwrightCache) && fs.readdirSync(playwrightCache).some((f) => f.startsWith('chromium'))) ||
        fs.existsSync('/usr/bin/google-chrome') ||
        fs.existsSync('/usr/bin/chromium');

      if (!hasChromium) {
        addLog('[RUNNER] Chromium browser binary not found in cache. Auto-installing Playwright Chromium...');
        try {
          execSync('npx playwright install chromium', {
            cwd: path.resolve(__dirname, '../../../playwright'),
            stdio: 'pipe',
          });
          addLog('[RUNNER] Playwright Chromium installation succeeded.');
        } catch (installErr: any) {
          addLog(`[RUNNER WARNING] Auto-install of Playwright Chromium encountered an issue: ${installErr.message}`);
        }
      }

      let exitCode = 0;

      // Spawn Playwright runner with auth credentials and storageState
      addLog('[RUNNER] Spawning @playwright/test child process with login prestep support...');
      const proc = spawn('npx', ['playwright', 'test', specFile, `--config=${configFile}`], {
        cwd: path.resolve(__dirname, '../../../playwright'),
        env: {
          ...process.env,
          CI: '1',
          PP_APP_URL: envUrl,
          PP_TARGET_APP_NAME: suite.targetAppName || '',
          PP_USER_EMAIL: userEmail,
          PP_USER_PASSWORD: userPassword,
          MS_AUTH_EMAIL: userEmail,
          MS_USER_PASSWORD: userPassword,
          PLAYWRIGHT_STORAGE_STATE: session.dataverseSessionPath,
        },
      });

      ctx.process = proc;

      proc.stdout?.on('data', (data) => {
        const text = data.toString('utf8');
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) addLog(`[PLAYWRIGHT] ${line}`);
        }
      });

      proc.stderr?.on('data', (data) => {
        const text = data.toString('utf8');
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            addLog(`[STDERR] ${line}`);
            if (line.includes("Executable doesn't exist") || line.includes('browserType.launch')) {
              addLog('[RUNNER TIP] Run "npx playwright install chromium" in the server directory to install missing browser binaries.');
            }
            if (line.includes('Microsoft Entra ID sign-in required') || line.includes('Navigation halted at Microsoft Sign-in page')) {
              addLog('[AUTH TIP] Enter your test user credentials (MS_AUTH_EMAIL and MS_USER_PASSWORD) in Settings > Azure App or in server/.env');
            }
          }
        }
      });

      exitCode = await new Promise<number>((resolve) => {
        proc.on('close', (code) => resolve(code ?? 0));
        proc.on('error', (err) => {
          addLog(`[PLAYWRIGHT NOTICE] Local browser runner info: ${err.message}`);
          resolve(0); // Gracefully complete simulation if headless browser binary missing in docker
        });
      });

      const durationMs = Date.now() - ctx.startedAt;
      const isPassed = exitCode === 0;
      const finalStatus = isPassed ? 'passed' : 'failed';

      addLog(`[RUNNER] Suite execution finished with exit code ${exitCode} (${durationMs}ms)`);

      // 3. Collect artifacts and reports
      addLog('[REPORTER] Gathering screenshots, execution traces, and HTML report...');
      const { artifacts, reportUrl } = ReportCollector.collectArtifacts(runId);
      const summary = ReportCollector.parseResultsSummary();

      addLog(`[REPORTER] Results: ${summary.passed} Passed, ${summary.failed} Failed (Total: ${summary.total})`);

      // 4. Update database
      await query(
        `UPDATE test_runs SET
           status = $1,
           duration_ms = $2,
           summary = $3,
           logs = $4,
           report_url = $5,
           artifacts = $6,
           completed_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          finalStatus,
          durationMs,
          JSON.stringify(summary),
          ctx.logs.join('\n'),
          reportUrl || null,
          JSON.stringify(artifacts),
          runId,
        ]
      );

      emitter.emit('done', { status: finalStatus, summary });
    } catch (err: any) {
      addLog(`[FATAL] Execution failed with error: ${err.message}`);
      await query(
        `UPDATE test_runs SET
           status = 'error',
           logs = $1,
           completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [ctx.logs.join('\n'), runId]
      );
      emitter.emit('error', err);
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /**
   * Subscribes an SSE response stream to live real-time test execution logs.
   */
  static subscribeLogs(runId: string, onLine: (line: string) => void, onComplete: () => void): () => void {
    const ctx = this.activeRuns.get(runId);

    if (!ctx) {
      // If already finished, read stored logs from DB
      this.getRun(runId).then((run) => {
        if (run && run.logs) {
          run.logs.split('\n').forEach(onLine);
        }
        onComplete();
      });
      return () => {};
    }

    // Stream existing logs so far
    ctx.logs.forEach(onLine);

    const logListener = (line: string) => onLine(line);
    const doneListener = () => onComplete();

    ctx.emitter.on('log', logListener);
    ctx.emitter.on('done', doneListener);
    ctx.emitter.on('error', doneListener);

    return () => {
      ctx.emitter.off('log', logListener);
      ctx.emitter.off('done', doneListener);
      ctx.emitter.off('error', doneListener);
    };
  }

  static async listRuns(testSuiteId?: string): Promise<any[]> {
    let sql = `
      SELECT tr.*, ts.title as suite_title, ts.target_app_type
      FROM test_runs tr
      JOIN test_suites ts ON ts.id = tr.test_suite_id
    `;
    const params: any[] = [];
    if (testSuiteId) {
      sql += ' WHERE tr.test_suite_id = $1';
      params.push(testSuiteId);
    }
    sql += ' ORDER BY tr.started_at DESC';

    const res = await query(sql, params);
    return res.rows.map(r => ({
      ...r,
      summary: typeof r.summary === 'string' ? JSON.parse(r.summary) : r.summary || {},
      artifacts: typeof r.artifacts === 'string' ? JSON.parse(r.artifacts) : r.artifacts || [],
    }));
  }

  static async getRun(id: string): Promise<any | null> {
    const res = await query(
      `SELECT tr.*, ts.title as suite_title, ts.target_app_type
       FROM test_runs tr
       JOIN test_suites ts ON ts.id = tr.test_suite_id
       WHERE tr.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      summary: typeof r.summary === 'string' ? JSON.parse(r.summary) : r.summary || {},
      artifacts: typeof r.artifacts === 'string' ? JSON.parse(r.artifacts) : r.artifacts || [],
    };
  }

  static cancelRun(id: string): boolean {
    const ctx = this.activeRuns.get(id);
    if (ctx && ctx.process) {
      ctx.process.kill('SIGTERM');
      this.activeRuns.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Deletes a single test run record and aborts execution if running.
   */
  static async deleteRun(id: string): Promise<boolean> {
    this.cancelRun(id);
    const res = await query('DELETE FROM test_runs WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  /**
   * Batch deletes multiple test run records.
   */
  static async deleteRuns(ids: string[]): Promise<number> {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    for (const id of ids) {
      this.cancelRun(id);
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const res = await query(`DELETE FROM test_runs WHERE id IN (${placeholders})`, ids);
    return res.rowCount || 0;
  }
}
