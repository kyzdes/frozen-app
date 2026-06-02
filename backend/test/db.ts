// Shared test-DB helper.
//
// Connects to a local Postgres via process.env.DATABASE_URL (defaulting to the
// docker-compose.local.yml credentials), applies migrations 001-005 in order
// (reusing the exact .sql files migrations/run.js applies), and offers a
// truncate/reset helper to isolate tests.
//
// CRITICAL contract for the suite: `hasTestDb` is true ONLY when a Postgres is
// reachable at startup. Every DB-touching test must guard with
// `describe.skipIf(!hasTestDb)` / `it.skipIf(!hasTestDb)` so that `npm test`
// with NO database still passes green — exactly like the intentionally skipped
// tests in src/services/conflict-resolver.test.ts.
//
// CONCURRENCY: vitest runs test FILES in parallel worker processes. They all
// share one physical Postgres, and some tests run global DDL (migration 005
// drops/re-adds a table-wide CHECK constraint) or `TRUNCATE ... CASCADE`. To
// keep those from deadlocking / racing each other across processes, every
// DB-touching test serializes through a Postgres session-level ADVISORY LOCK
// (cross-process, cross-connection). Use acquireDbLock()/releaseDbLock() in
// beforeEach/afterEach.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Pool } from 'pg';

// Default matches backend/docker-compose.local.yml (POSTGRES_USER/PASSWORD/DB).
export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://freezer:localdev123@localhost:5432/freezer';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'migrations'
);

// A fixed key so all worker processes contend on the SAME advisory lock.
const ADVISORY_LOCK_KEY = 728193;

/** Tables created by the migrations, ordered so TRUNCATE ... CASCADE is clean. */
const RESETTABLE_TABLES = [
  'history_events',
  'items',
  'categories',
  'invites',
  'auth_sessions',
  'pair_members',
  'pairs',
  'users',
];

/**
 * Probe the configured Postgres once at module load. We deliberately use a
 * short connection timeout so that, with NO database around, this resolves
 * quickly to `false` and the whole DB-bound suite is skipped (green run).
 */
async function probeDb(): Promise<boolean> {
  const client = new Client({
    connectionString: TEST_DATABASE_URL,
    connectionTimeoutMillis: 1500,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

// Resolved at import time. Top-level await is fine: vitest runs ESM and the
// suites only read `hasTestDb` synchronously after import settles.
export const hasTestDb: boolean = await probeDb();

let migrated = false;

/**
 * Apply every migration in backend/migrations in filename order, mirroring the
 * idempotent behavior of migrations/run.js (each file is wrapped in its own
 * transaction and recorded in `_migrations`). Safe to call repeatedly; the
 * `_migrations` ledger means already-applied files are skipped.
 */
export async function runMigrations(): Promise<void> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const already = await client.query(
        'SELECT name FROM _migrations WHERE name = $1',
        [file]
      );
      if (already.rows.length > 0) continue;

      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    await client.end();
  }
}

let sharedPool: Pool | null = null;

/**
 * Get a lazily-created shared pool against the test DB. Callers must invoke
 * `closePool()` in an afterAll so vitest can exit cleanly.
 */
export function getPool(): Pool {
  if (!sharedPool) {
    sharedPool = new Pool({ connectionString: TEST_DATABASE_URL, max: 4 });
  }
  return sharedPool;
}

export async function closePool(): Promise<void> {
  await releaseDbLock();
  if (sharedPool) {
    await sharedPool.end();
    sharedPool = null;
  }
}

// Dedicated single connection that holds the advisory lock for this worker
// process. Session-level advisory locks are tied to the connection that took
// them, so we must use the same client to release.
let lockClient: Client | null = null;

/**
 * Acquire the global cross-process advisory lock. Blocks until granted, so only
 * one DB-touching test (across all vitest workers) runs at a time. Idempotent
 * per process is NOT assumed — pair each call with one releaseDbLock().
 */
export async function acquireDbLock(): Promise<void> {
  if (!lockClient) {
    lockClient = new Client({ connectionString: TEST_DATABASE_URL });
    await lockClient.connect();
  }
  await lockClient.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
}

/** Release the global advisory lock held by this worker process. */
export async function releaseDbLock(): Promise<void> {
  if (!lockClient) return;
  try {
    await lockClient.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    await lockClient.end();
  } catch {
    /* ignore */
  } finally {
    lockClient = null;
  }
}

/**
 * Ensure migrations are applied (once per process) and truncate all data
 * tables so each test starts from a clean slate. MUST be called while holding
 * the advisory lock (see acquireDbLock) so the TRUNCATE cannot deadlock against
 * a concurrent worker.
 */
export async function resetDb(): Promise<void> {
  if (!migrated) {
    await runMigrations();
    migrated = true;
  }
  const pool = getPool();
  await pool.query(
    `TRUNCATE ${RESETTABLE_TABLES.join(', ')} RESTART IDENTITY CASCADE`
  );
}

/** Convenience: insert a pair and return its id (server_version starts at 0). */
export async function seedPair(
  pool: Pool,
  name = 'Test Freezer'
): Promise<string> {
  const res = await pool.query(
    `INSERT INTO pairs (name, server_version) VALUES ($1, 0) RETURNING id`,
    [name]
  );
  return res.rows[0].id as string;
}

/** Convenience: insert an account user and return its id. */
export async function seedUser(
  pool: Pool,
  email = `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.local`
): Promise<string> {
  const res = await pool.query(
    `INSERT INTO users (email, name, is_account, password_hash)
     VALUES ($1, 'Tester', TRUE, 'x') RETURNING id`,
    [email]
  );
  return res.rows[0].id as string;
}

/** Convenience: add a user to a pair as owner and set it active. */
export async function seedMembership(
  pool: Pool,
  pairId: string,
  userId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO pair_members (pair_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [pairId, userId]
  );
  await pool.query(`UPDATE users SET active_pair_id = $1 WHERE id = $2`, [
    pairId,
    userId,
  ]);
}
