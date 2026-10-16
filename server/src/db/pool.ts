import { Pool, PoolClient, QueryResult } from 'pg';
import { newDb, IMemoryDb } from 'pg-mem';
import { config } from '../config/env';
import fs from 'fs';
import path from 'path';

let realPool: Pool | null = null;
let memDb: IMemoryDb | null = null;
let memClient: any = null;
let usingFallback = false;

export interface DbQueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export function isFallbackMode(): boolean {
  return usingFallback;
}

export async function initDb(): Promise<void> {
  try {
    const testPool = new Pool({
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 1500,
    });

    // Test connection
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();

    realPool = testPool;
    usingFallback = false;
    console.log('[DB] Successfully connected to PostgreSQL database.');
  } catch (err: any) {
    console.warn(`[DB] PostgreSQL unavailable (${err.message || 'connection failed'}). Initializing zero-dependency in-process PostgreSQL memory store.`);
    usingFallback = true;
    memDb = newDb();

    // Register gen_random_uuid() in pg-mem
    const { v4: uuidv4 } = require('uuid');
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      implementation: () => uuidv4(),
    });

    // Register now() / current_timestamp
    memDb.public.registerFunction({
      name: 'now',
      implementation: () => new Date().toISOString(),
    });

    const pgAdapter = memDb.adapters.createPg();
    memClient = new pgAdapter.Pool();

    // Auto-run migrations in fallback mode
    await runMigrationsInternal();
    console.log('[DB] In-process fallback database initialized and migrated successfully.');
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<DbQueryResult<T>> {
  if (usingFallback && memClient) {
    const res = await memClient.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: res.rowCount ?? (res.rows ? res.rows.length : 0),
    };
  }

  if (!realPool) {
    await initDb();
  }

  if (usingFallback && memClient) {
    const res = await memClient.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: res.rowCount ?? (res.rows ? res.rows.length : 0),
    };
  }

  const rawRes: any = await realPool!.query(text, params);
  if (Array.isArray(rawRes)) {
    const last = rawRes[rawRes.length - 1];
    return {
      rows: last?.rows || [],
      rowCount: last?.rowCount ?? (last?.rows ? last.rows.length : 0),
    };
  }
  return {
    rows: rawRes.rows || [],
    rowCount: rawRes.rowCount ?? (rawRes.rows ? rawRes.rows.length : 0),
  };
}

export async function getClient(): Promise<PoolClient | any> {
  if (usingFallback && memClient) {
    return memClient.connect();
  }

  if (!realPool) {
    await initDb();
  }

  if (usingFallback && memClient) {
    return memClient.connect();
  }

  return realPool!.connect();
}

export async function closeDb(): Promise<void> {
  if (realPool) {
    await realPool.end();
    realPool = null;
  }
  if (memClient) {
    await memClient.end();
    memClient = null;
    memDb = null;
  }
}

export async function runMigrationsInternal(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    if (usingFallback && memClient) {
      await memClient.query(sql);
    } else if (realPool) {
      await realPool.query(sql);
    }
  }
}
