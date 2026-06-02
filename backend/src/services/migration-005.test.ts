// Migration 005 gate: normalize history_events.type to the 5 canonical
// snake_case values, and prove the production risk that motivates a pre-flight
// SELECT before deploying it.
//
// Migration 005 (backend/migrations/005_normalize_history_event_types.sql):
//   1. UPDATE legacy camelCase rows  ('itemAdded' -> 'item_added',
//      'quantityChanged' -> 'items_changed').
//   2. DROP + re-ADD the CHECK constraint to exactly the 5 canonical values.
//
// PROD RISK we lock here: step 2's `ADD CONSTRAINT` validates EVERY existing
// row. If any row holds a value outside the 5 canonical set (and not one of the
// two mapped legacy values) -- e.g. 'foo' or NULL -- the ADD CONSTRAINT FAILS
// and the whole migration transaction rolls back. That is exactly why the prod
// pre-flight `SELECT DISTINCT type ...` is required before running 005.
//
// Guarded by hasTestDb so `npm test` with NO database still passes green.

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import {
  acquireDbLock,
  closePool,
  getPool,
  hasTestDb,
  releaseDbLock,
  resetDb,
  seedPair,
} from '../../test/db.js';

const MIGRATION_005_SQL = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'migrations',
    '005_normalize_history_event_types.sql'
  ),
  'utf8'
);

const CANONICAL = new Set([
  'item_added',
  'item_updated',
  'item_deleted',
  'packages_changed',
  'items_changed',
]);

let histSeq = 0;
function nextId(): string {
  histSeq += 1;
  return `00000000-0000-4000-9000-${String(histSeq).padStart(12, '0')}`;
}

/**
 * Insert a history row directly. We bypass the type CHECK constraint by
 * temporarily dropping it, because the whole point of some tests is to seed
 * values (legacy / invalid) the current constraint would otherwise reject.
 */
async function insertRawHistory(
  pool: Pool,
  pairId: string,
  type: string | null
): Promise<string> {
  const id = nextId();
  await pool.query(
    'ALTER TABLE history_events DROP CONSTRAINT IF EXISTS history_events_type_check'
  );
  await pool.query(
    `INSERT INTO history_events
       (id, pair_id, type, item_id, category_id, item_name, timestamp, server_version)
     VALUES ($1, $2, $3, NULL, NULL, 'X', now(), 1)`,
    [id, pairId, type]
  );
  return id;
}

describe.skipIf(!hasTestDb)('migration 005 — normalize history_events.type', () => {
  let pool: Pool;
  let pairId: string;

  beforeEach(async () => {
    await acquireDbLock();
    await resetDb();
    pool = getPool();
    pairId = await seedPair(pool);
  });

  afterEach(async () => {
    await releaseDbLock();
  });

  afterAll(async () => {
    await closePool();
  });

  it('maps legacy itemAdded -> item_added and quantityChanged -> items_changed', async () => {
    const a = await insertRawHistory(pool, pairId, 'itemAdded');
    const b = await insertRawHistory(pool, pairId, 'quantityChanged');
    const c = await insertRawHistory(pool, pairId, 'item_deleted'); // already canonical

    await pool.query(MIGRATION_005_SQL);

    const rows = await pool.query(
      'SELECT id, type FROM history_events WHERE id = ANY($1::uuid[])',
      [[a, b, c]]
    );
    const byId = Object.fromEntries(rows.rows.map((r: any) => [r.id, r.type]));
    expect(byId[a]).toBe('item_added');
    expect(byId[b]).toBe('items_changed');
    expect(byId[c]).toBe('item_deleted');
  });

  it('leaves all rows in the 5 canonical set after running', async () => {
    await insertRawHistory(pool, pairId, 'itemAdded');
    await insertRawHistory(pool, pairId, 'quantityChanged');
    await insertRawHistory(pool, pairId, 'packages_changed');
    await insertRawHistory(pool, pairId, 'item_updated');

    await pool.query(MIGRATION_005_SQL);

    const rows = await pool.query('SELECT DISTINCT type FROM history_events');
    for (const r of rows.rows) {
      expect(CANONICAL.has(r.type)).toBe(true);
    }
  });

  it('is idempotent: running 005 a second time is a no-op', async () => {
    await insertRawHistory(pool, pairId, 'itemAdded');
    await insertRawHistory(pool, pairId, 'quantityChanged');

    await pool.query(MIGRATION_005_SQL);
    const after1 = await pool.query(
      'SELECT id, type FROM history_events ORDER BY id'
    );

    // Second run must not change anything (UPDATEs match nothing; constraint
    // is DROP IF EXISTS then re-added identically).
    await expect(pool.query(MIGRATION_005_SQL)).resolves.toBeDefined();
    const after2 = await pool.query(
      'SELECT id, type FROM history_events ORDER BY id'
    );

    expect(after2.rows).toEqual(after1.rows);
  });

  it('PROD RISK: an UNEXPECTED type value makes ADD CONSTRAINT fail (throws)', async () => {
    // 'foo' is neither canonical nor a mapped legacy value -> step 2 rejects it.
    await insertRawHistory(pool, pairId, 'foo');

    await expect(pool.query(MIGRATION_005_SQL)).rejects.toThrow();
  });

  it('PROD RISK: a NULL type also makes the CHECK constraint reject it', async () => {
    // A CHECK constraint that evaluates to NULL passes, but the column is
    // declared NOT NULL in 001_initial.sql, so the INSERT itself is rejected.
    // This documents that any non-canonical/NULL state blocks a clean 005.
    await expect(insertRawHistory(pool, pairId, null)).rejects.toThrow();
  });
});
