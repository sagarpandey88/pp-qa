import { initDb, query, closeDb, isFallbackMode } from '../src/db/pool';

describe('Database & Migrations Verification', () => {
  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should initialize database and report mode', () => {
    expect(typeof isFallbackMode()).toBe('boolean');
  });

  it('should verify all 9 core tables exist', async () => {
    const requiredTables = [
      'users',
      'azure_app_profiles',
      'byok_keys',
      'solutions',
      'solution_tables',
      'solution_flows',
      'solution_copilot_bots',
      'test_suites',
      'test_runs'
    ];

    for (const table of requiredTables) {
      const res = await query(`SELECT * FROM ${table} LIMIT 1`);
      expect(res).toBeDefined();
      expect(Array.isArray(res.rows)).toBe(true);
    }
  });

  it('should support insert and select on users table', async () => {
    const email = `test-${Date.now()}@contoso.com`;
    const oid = `oid-${Date.now()}`;
    const insertRes = await query(
      `INSERT INTO users (microsoft_oid, email, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name`,
      [oid, email, 'Test User']
    );

    expect(insertRes.rows.length).toBe(1);
    expect(insertRes.rows[0].email).toBe(email);
    expect(insertRes.rows[0].id).toBeDefined();

    const fetchRes = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    expect(fetchRes.rows.length).toBe(1);
    expect(fetchRes.rows[0].display_name).toBe('Test User');
  });
});

