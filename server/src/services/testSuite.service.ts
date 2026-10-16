import { query } from '../db/pool';
import { synthesizePlaywrightTestSuite, ScenarioDefinition } from './testgen/testSynthesizer';
import { AgenticScenarioGenerator } from './testgen/agenticScenarioGenerator';
import { AgenticSynthesizer } from './testgen/agenticSynthesizer';
import fs from 'fs';
import path from 'path';

export interface TestSuiteRecord {
  id: string;
  solutionId: string;
  solutionName?: string;
  solutionUniqueName?: string;
  solutionVersion?: string;
  title: string;
  description: string;
  targetAppType: string;
  targetAppName: string;
  scenarios: ScenarioDefinition[];
  generatedCode: string;
  createdAt: string;
  updatedAt: string;
}

export class TestSuiteService {
  static async listSuites(solutionId?: string): Promise<any[]> {
    let sql = `
      SELECT ts.*,
             s.friendly_name as solution_name,
             s.unique_name as solution_unique_name,
             s.version as solution_version
      FROM test_suites ts
      LEFT JOIN solutions s ON ts.solution_id = s.id
    `;
    const params: any[] = [];
    if (solutionId) {
      sql += ' WHERE ts.solution_id = $1';
      params.push(solutionId);
    }
    sql += ' ORDER BY ts.updated_at DESC';

    const res = await query(sql, params);
    return res.rows.map(r => ({
      ...r,
      solutionId: r.solution_id,
      solutionName: r.solution_name || r.solution_unique_name || '',
      solutionUniqueName: r.solution_unique_name || '',
      solutionVersion: r.solution_version || '',
      targetAppType: r.target_app_type,
      targetAppName: r.target_app_name,
      generatedCode: r.generated_code || '',
      scenarios: typeof r.scenarios === 'string' ? JSON.parse(r.scenarios) : r.scenarios || [],
    }));
  }

  static async getSuite(id: string): Promise<TestSuiteRecord | null> {
    const res = await query(
      `SELECT ts.*,
              s.friendly_name as solution_name,
              s.unique_name as solution_unique_name,
              s.version as solution_version
       FROM test_suites ts
       LEFT JOIN solutions s ON ts.solution_id = s.id
       WHERE ts.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      solutionId: r.solution_id,
      solutionName: r.solution_name || r.solution_unique_name || '',
      solutionUniqueName: r.solution_unique_name || '',
      solutionVersion: r.solution_version || '',
      title: r.title,
      description: r.description,
      targetAppType: r.target_app_type,
      targetAppName: r.target_app_name,
      scenarios: typeof r.scenarios === 'string' ? JSON.parse(r.scenarios) : r.scenarios || [],
      generatedCode: r.generated_code || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  static async createSuite(
    solutionId: string,
    title: string,
    description: string,
    targetAppType: string,
    targetAppName: string,
    scenarios: ScenarioDefinition[] = [],
    options?: { useAi?: boolean; provider?: string; model?: string; userId?: string }
  ): Promise<TestSuiteRecord> {
    // Generate initial Playwright code using AgenticSynthesizer
    const generatedCode = await AgenticSynthesizer.synthesize({
      suiteTitle: title,
      targetAppType,
      targetAppName,
      scenarios,
      solutionId,
      userId: options?.userId,
      useAi: options?.useAi,
      provider: options?.provider,
      model: options?.model,
    });

    const res = await query(
      `INSERT INTO test_suites
       (solution_id, title, description, target_app_type, target_app_name, scenarios, generated_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        solutionId,
        title,
        description,
        targetAppType,
        targetAppName,
        JSON.stringify(scenarios),
        generatedCode,
      ]
    );

    const r = res.rows[0];

    // Save spec file to playwright/generated-tests directory
    await this.persistSpecFile(r.id, generatedCode);

    return {
      id: r.id,
      solutionId: r.solution_id,
      title: r.title,
      description: r.description,
      targetAppType: r.target_app_type,
      targetAppName: r.target_app_name,
      scenarios,
      generatedCode,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  static async updateSuite(
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      solutionId: string;
      targetAppType: string;
      targetAppName: string;
      scenarios: ScenarioDefinition[];
      generatedCode: string;
      preserveCode: boolean;
    }>,
    options?: { useAi?: boolean; provider?: string; model?: string; userId?: string }
  ): Promise<TestSuiteRecord | null> {
    const existing = await this.getSuite(id);
    if (!existing) return null;

    const title = updates.title ?? existing.title;
    const description = updates.description ?? existing.description;
    const solutionId = updates.solutionId !== undefined ? (updates.solutionId || null) : existing.solutionId;
    const targetAppType = updates.targetAppType ?? existing.targetAppType;
    const targetAppName = updates.targetAppName ?? existing.targetAppName;
    const scenarios = updates.scenarios ?? existing.scenarios;

    let generatedCode = updates.generatedCode;
    if (generatedCode === undefined && !updates.preserveCode && (updates.scenarios !== undefined || !existing.generatedCode)) {
      // Re-synthesize code when scenarios are updated or suite has none yet (unless preserveCode is explicitly true)
      generatedCode = await AgenticSynthesizer.synthesize({
        suiteTitle: title,
        targetAppType,
        targetAppName,
        scenarios,
        solutionId: solutionId || undefined,
        userId: options?.userId,
        useAi: options?.useAi,
        provider: options?.provider,
        model: options?.model,
      });
    } else if (generatedCode === undefined) {
      generatedCode = existing.generatedCode;
    }

    const res = await query(
      `UPDATE test_suites SET
         solution_id = $1,
         title = $2,
         description = $3,
         target_app_type = $4,
         target_app_name = $5,
         scenarios = $6,
         generated_code = $7,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        solutionId,
        title,
        description,
        targetAppType,
        targetAppName,
        JSON.stringify(scenarios),
        generatedCode,
        id,
      ]
    );

    const r = res.rows[0];
    await this.persistSpecFile(id, generatedCode);

    return {
      id: r.id,
      solutionId: r.solution_id,
      title: r.title,
      description: r.description,
      targetAppType: r.target_app_type,
      targetAppName: r.target_app_name,
      scenarios,
      generatedCode,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Dedicated folder where all synthesized Playwright specs are stored.
   */
  static getGeneratedTestsDir(): string {
    const dir = path.resolve(__dirname, '../../playwright/generated-tests');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Resolves the canonical file path for a suite's Playwright spec.
   */
  static getSpecFilePath(suiteId: string): string {
    return path.join(this.getGeneratedTestsDir(), `suite-${suiteId}.spec.ts`);
  }

  static async deleteSuite(id: string): Promise<boolean> {
    const res = await query('DELETE FROM test_suites WHERE id = $1', [id]);
    const specFile = this.getSpecFilePath(id);
    if (fs.existsSync(specFile)) {
      try { fs.unlinkSync(specFile); } catch (e) {}
    }
    return (res.rowCount || 0) > 0;
  }

  static async persistSpecFile(suiteId: string, code: string): Promise<string> {
    const filePath = this.getSpecFilePath(suiteId);
    fs.writeFileSync(filePath, code, 'utf8');
    return filePath;
  }

  /**
   * Cleans up orphaned spec files from the generated-tests folder.
   */
  static async cleanupOrphanedSpecs(): Promise<number> {
    try {
      const dir = this.getGeneratedTestsDir();
      if (!fs.existsSync(dir)) return 0;
      const res = await query('SELECT id FROM test_suites');
      const validIds = new Set(res.rows.map(r => r.id));
      const files = fs.readdirSync(dir);
      let removed = 0;
      for (const file of files) {
        if (file.startsWith('suite-') && file.endsWith('.spec.ts')) {
          const id = file.replace(/^suite-/, '').replace(/\.spec\.ts$/, '');
          if (!validIds.has(id)) {
            try {
              fs.unlinkSync(path.join(dir, file));
              removed++;
            } catch (e) {}
          }
        }
      }
      return removed;
    } catch {
      return 0;
    }
  }

  /**
   * Generates tailored Playwright test scenarios by inspecting the solution's
   * actual Dataverse tables, cloud flows, and Copilot bots from PostgreSQL,
   * with multi-model AI reasoning and offline metadata-driven fallback.
   */
  static async generateScenariosForSolution(
    solutionId: string,
    options: {
      focusArea?: string;
      prompt?: string;
      targetAppType?: string;
      targetAppName?: string;
      provider?: string;
      model?: string;
    } = {},
    userId?: string
  ): Promise<ScenarioDefinition[]> {
    return AgenticScenarioGenerator.generateScenarios(solutionId, options, userId);
  }
}

