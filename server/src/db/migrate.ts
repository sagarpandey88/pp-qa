import fs from 'fs';
import path from 'path';
import { query, initDb, isFallbackMode } from './pool';

async function runMigrations() {
  console.log('[MIGRATE] Initializing database connection...');
  await initDb();

  // Create migrations table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`[MIGRATE] Found ${files.length} migration file(s).`);

  for (const file of files) {
    const existing = await query('SELECT id FROM _migrations WHERE name = $1', [file]);
    if (existing.rows.length > 0) {
      console.log(`[MIGRATE] Skipping already applied: ${file}`);
      continue;
    }

    console.log(`[MIGRATE] Applying migration: ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    await query(sql);
    await query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    console.log(`[MIGRATE] Successfully applied: ${file}`);
  }

  console.log(`[MIGRATE] All migrations complete (Mode: ${isFallbackMode() ? 'In-Memory Fallback' : 'PostgreSQL Live'}).`);
  process.exit(0);
}

if (require.main === module) {
  runMigrations().catch(err => {
    console.error('[MIGRATE] Migration error:', err);
    process.exit(1);
  });
}

