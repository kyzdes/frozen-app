// Account-deletion integration tests (GDPR erasure / Apple 5.1.1(v)).
//
// Drives the REAL deletion path (`deleteUserAccount`) against a live Postgres so
// the cascade behavior and the manual invite-detach (the `invites.created_by` /
// `invites.used_by` FKs are RESTRICT, not CASCADE) are exercised for real.
//
// Guarded by hasTestDb: with NO database the whole suite is skipped and
// `npm test` still passes green — same contract as src/routes/sync.test.ts.

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { deleteUserAccount } from './account.js';
import {
  acquireDbLock,
  closePool,
  getPool,
  hasTestDb,
  releaseDbLock,
  resetDb,
  seedMembership,
  seedPair,
  seedUser,
} from '../../test/db.js';

const UID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Run the real deletion inside its own transaction, like the route does. */
async function runDelete(pool: Pool, userId: string): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    await deleteUserAccount(client, userId);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function count(pool: Pool, sql: string, params: any[]): Promise<number> {
  const res = await pool.query(`SELECT COUNT(*)::int AS c FROM ${sql}`, params);
  return res.rows[0].c as number;
}

describe.skipIf(!hasTestDb)('deleteUserAccount (live DB)', () => {
  let pool: Pool;

  beforeEach(async () => {
    await acquireDbLock();
    await resetDb();
    pool = getPool();
  });

  afterEach(async () => {
    await releaseDbLock();
  });

  afterAll(async () => {
    await closePool();
  });

  it('sole member: drops the pair, all its data, invites, sessions, and the user', async () => {
    const pairId = await seedPair(pool, 'Solo Freezer');
    const userId = await seedUser(pool, 'solo@test.local');
    await seedMembership(pool, pairId, userId);

    await pool.query(
      `INSERT INTO categories (id, pair_id, name, updated_at, server_version)
       VALUES ($1, $2, 'Meat', NOW(), 1)`,
      [UID(1), pairId]
    );
    await pool.query(
      `INSERT INTO items (id, pair_id, category_id, name, freeze_date, expiration_date, updated_at, server_version)
       VALUES ($1, $2, $3, 'Chicken', '2026-01-01', '2026-06-01', NOW(), 2)`,
      [UID(2), pairId, UID(1)]
    );
    await pool.query(
      `INSERT INTO history_events (id, pair_id, type, item_id, category_id, item_name, timestamp, server_version)
       VALUES ($1, $2, 'item_added', $3, $4, 'Chicken', NOW(), 3)`,
      [UID(3), pairId, UID(2), UID(1)]
    );
    await pool.query(
      `INSERT INTO invites (code, pair_id, created_by, expires_at)
       VALUES ('SOLO01', $1, $2, NOW() + INTERVAL '1 day')`,
      [pairId, userId]
    );
    await pool.query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, 'hash-solo', NOW() + INTERVAL '30 days')`,
      [userId]
    );

    await runDelete(pool, userId);

    expect(await count(pool, 'users WHERE id = $1', [userId])).toBe(0);
    expect(await count(pool, 'pairs WHERE id = $1', [pairId])).toBe(0);
    expect(await count(pool, 'categories WHERE pair_id = $1', [pairId])).toBe(0);
    expect(await count(pool, 'items WHERE pair_id = $1', [pairId])).toBe(0);
    expect(await count(pool, 'history_events WHERE pair_id = $1', [pairId])).toBe(0);
    expect(await count(pool, 'invites WHERE pair_id = $1', [pairId])).toBe(0);
    expect(await count(pool, 'auth_sessions WHERE user_id = $1', [userId])).toBe(0);
    expect(await count(pool, 'pair_members WHERE user_id = $1', [userId])).toBe(0);
  });

  it('shared pair: partner keeps the freezer; the deleted member is detached and removed', async () => {
    const pairId = await seedPair(pool, 'Shared Freezer');
    const owner = await seedUser(pool, 'owner@test.local');
    const joiner = await seedUser(pool, 'joiner@test.local');

    await seedMembership(pool, pairId, owner); // owner = member + active
    await pool.query(
      `INSERT INTO pair_members (pair_id, user_id, role) VALUES ($1, $2, 'member')`,
      [pairId, joiner]
    );
    await pool.query(`UPDATE users SET active_pair_id = $1 WHERE id = $2`, [pairId, joiner]);

    await pool.query(
      `INSERT INTO categories (id, pair_id, name, updated_at, server_version)
       VALUES ($1, $2, 'Veg', NOW(), 1)`,
      [UID(1), pairId]
    );
    // owner created the invite, joiner consumed it.
    await pool.query(
      `INSERT INTO invites (code, pair_id, created_by, used_by, used_at, expires_at)
       VALUES ('SHARE1', $1, $2, $3, NOW(), NOW() + INTERVAL '1 day')`,
      [pairId, owner, joiner]
    );
    await pool.query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, 'hash-joiner', NOW() + INTERVAL '30 days')`,
      [joiner]
    );

    await runDelete(pool, joiner);

    // Deleted member is gone.
    expect(await count(pool, 'users WHERE id = $1', [joiner])).toBe(0);
    expect(await count(pool, 'pair_members WHERE user_id = $1', [joiner])).toBe(0);
    expect(await count(pool, 'auth_sessions WHERE user_id = $1', [joiner])).toBe(0);

    // Pair, partner, and shared data survive.
    expect(await count(pool, 'pairs WHERE id = $1', [pairId])).toBe(1);
    expect(await count(pool, 'users WHERE id = $1', [owner])).toBe(1);
    expect(await count(pool, 'categories WHERE pair_id = $1', [pairId])).toBe(1);
    expect(await count(pool, 'pair_members WHERE pair_id = $1 AND user_id = $2', [pairId, owner])).toBe(1);

    // Invite preserved but the consumed-by reference is detached.
    const inv = await pool.query(`SELECT used_by FROM invites WHERE code = 'SHARE1'`);
    expect(inv.rowCount).toBe(1);
    expect(inv.rows[0].used_by).toBeNull();
  });

  it('deleting the pair owner in a shared pair removes their invites but keeps the pair for the partner', async () => {
    const pairId = await seedPair(pool, 'Shared Freezer 2');
    const owner = await seedUser(pool, 'owner2@test.local');
    const joiner = await seedUser(pool, 'joiner2@test.local');

    await seedMembership(pool, pairId, owner);
    await pool.query(
      `INSERT INTO pair_members (pair_id, user_id, role) VALUES ($1, $2, 'member')`,
      [pairId, joiner]
    );
    await pool.query(`UPDATE users SET active_pair_id = $1 WHERE id = $2`, [pairId, joiner]);
    // owner created an (unused) invite.
    await pool.query(
      `INSERT INTO invites (code, pair_id, created_by, expires_at)
       VALUES ('OWN001', $1, $2, NOW() + INTERVAL '1 day')`,
      [pairId, owner]
    );

    await runDelete(pool, owner);

    expect(await count(pool, 'users WHERE id = $1', [owner])).toBe(0);
    expect(await count(pool, 'pairs WHERE id = $1', [pairId])).toBe(1);
    expect(await count(pool, 'users WHERE id = $1', [joiner])).toBe(1);
    // Owner-created invite removed (created_by FK is RESTRICT, so it must be cleared).
    expect(await count(pool, `invites WHERE code = 'OWN001'`, [])).toBe(0);
  });
});
