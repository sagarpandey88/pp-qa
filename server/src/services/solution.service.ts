import { query } from '../db/pool';
import { ExtractedSolutionResult } from './parser/zipExtractor';

export class SolutionService {
  /**
   * Persists extracted solution and all child components into PostgreSQL.
   */
  static async saveExtractedSolution(
    userId: string,
    extracted: ExtractedSolutionResult,
    zipPath?: string
  ): Promise<string> {
    const { metadata, markdown } = extracted;
    const { manifest, tables, flows, bots } = metadata;

    // Check if solution with this uniqueName already exists for user
    const existing = await query(
      'SELECT id FROM solutions WHERE unique_name = $1 AND user_id = $2',
      [manifest.uniqueName, userId]
    );

    let solutionId: string;

    if (existing.rows.length > 0) {
      solutionId = existing.rows[0].id;
      await query(
        `UPDATE solutions SET
           friendly_name = $1,
           version = $2,
           is_managed = $3,
           publisher_name = $4,
           publisher_prefix = $5,
           markdown_content = $6,
           raw_metadata = $7,
           zip_storage_path = $8,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [
          manifest.friendlyName,
          manifest.version,
          manifest.isManaged,
          manifest.publisher.friendlyName || manifest.publisher.uniqueName,
          manifest.publisher.customizationPrefix,
          markdown,
          JSON.stringify(metadata),
          zipPath || null,
          solutionId,
        ]
      );

      // Clean existing child components
      await query('DELETE FROM solution_tables WHERE solution_id = $1', [solutionId]);
      await query('DELETE FROM solution_flows WHERE solution_id = $1', [solutionId]);
      await query('DELETE FROM solution_copilot_bots WHERE solution_id = $1', [solutionId]);
    } else {
      const ins = await query(
        `INSERT INTO solutions
         (user_id, unique_name, friendly_name, version, is_managed, publisher_name, publisher_prefix, markdown_content, raw_metadata, zip_storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          userId,
          manifest.uniqueName,
          manifest.friendlyName,
          manifest.version,
          manifest.isManaged,
          manifest.publisher.friendlyName || manifest.publisher.uniqueName,
          manifest.publisher.customizationPrefix,
          markdown,
          JSON.stringify(metadata),
          zipPath || null,
        ]
      );
      solutionId = ins.rows[0].id;
    }

    // Insert solution tables
    for (const tbl of tables) {
      await query(
        `INSERT INTO solution_tables
         (solution_id, schema_name, display_name, primary_id_attribute, primary_name_attribute, columns, relationships)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          solutionId,
          tbl.schemaName,
          tbl.displayName,
          tbl.primaryIdAttribute,
          tbl.primaryNameAttribute,
          JSON.stringify(tbl.columns),
          JSON.stringify(tbl.relationships),
        ]
      );
    }

    // Insert solution flows
    for (const flow of flows) {
      await query(
        `INSERT INTO solution_flows
         (solution_id, workflow_id, name, trigger_type, triggers, actions, connection_references)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          solutionId,
          flow.workflowId,
          flow.name,
          flow.triggerType,
          JSON.stringify(flow.triggers),
          JSON.stringify(flow.actions),
          JSON.stringify(flow.connectionReferences),
        ]
      );
    }

    // Insert solution copilot bots
    for (const bot of bots) {
      await query(
        `INSERT INTO solution_copilot_bots
         (solution_id, bot_schema_name, display_name, topics)
         VALUES ($1, $2, $3, $4)`,
        [
          solutionId,
          bot.botSchemaName,
          bot.displayName,
          JSON.stringify(bot.topics),
        ]
      );
    }

    return solutionId;
  }

  static async listSolutions(userId: string) {
    const res = await query(
      `SELECT id, unique_name, friendly_name, version, is_managed,
              publisher_name, publisher_prefix, created_at, updated_at
       FROM solutions
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    const solutionsWithCounts = await Promise.all(
      res.rows.map(async (s: any) => {
        const tableRes = await query('SELECT COUNT(*) as count FROM solution_tables WHERE solution_id = $1', [s.id]);
        const flowRes = await query('SELECT COUNT(*) as count FROM solution_flows WHERE solution_id = $1', [s.id]);
        const botRes = await query('SELECT COUNT(*) as count FROM solution_copilot_bots WHERE solution_id = $1', [s.id]);
        return {
          ...s,
          table_count: parseInt(tableRes.rows[0]?.count || '0', 10),
          flow_count: parseInt(flowRes.rows[0]?.count || '0', 10),
          bot_count: parseInt(botRes.rows[0]?.count || '0', 10),
        };
      })
    );

    return solutionsWithCounts;
  }

  static async getSolution(id: string, userId: string) {
    const res = await query(
      `SELECT * FROM solutions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return res.rows[0] || null;
  }

  static async getSolutionTables(solutionId: string) {
    const res = await query(
      `SELECT * FROM solution_tables WHERE solution_id = $1 ORDER BY schema_name ASC`,
      [solutionId]
    );
    return res.rows;
  }

  static async getSolutionFlows(solutionId: string) {
    const res = await query(
      `SELECT * FROM solution_flows WHERE solution_id = $1 ORDER BY name ASC`,
      [solutionId]
    );
    return res.rows;
  }

  static async getSolutionBots(solutionId: string) {
    const res = await query(
      `SELECT * FROM solution_copilot_bots WHERE solution_id = $1 ORDER BY display_name ASC`,
      [solutionId]
    );
    return res.rows;
  }

  static async deleteSolution(id: string, userId: string) {
    const res = await query(
      'DELETE FROM solutions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (res.rowCount || 0) > 0;
  }
}
