// Sync round-trip integration tests.
//
// These exercise the REAL sync semantics against a live Postgres: the
// last-write-wins (LWW) conflict rule, the pair-scoped monotonic
// `pairs.server_version` counter, soft-delete propagation via `deleted_at`, and
// the server_changes wire shape (snake_case envelope keys, camelCase entity
// keys after snakeToCamel).
//
// The POST /sync route's apply functions (processEntity / processHistoryEvent /
// getServerChanges in src/routes/sync.ts) are module-private and fused to the
// JWT auth middleware, so we can't import them. Instead we drive the SAME
// algorithm the route runs — the exported `resolveConflict` core plus the
// identical SQL upsert + `server_version + 1` bump + the same `snakeToCamel`
// response shaping — directly against a seeded pair. This stays faithful to the
// route while remaining robust (no JWT plumbing) and fully DB-guarded.
//
// Guarded by hasTestDb: with NO database, the entire suite is skipped and
// `npm test` still passes green — exactly like the skipped tests in
// conflict-resolver.test.ts.

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { resolveConflict } from '../services/conflict-resolver.js';
import { camelToSnake, snakeToCamel } from '../utils/key-transform.js';
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

// --- Re-implementation of the route's apply path (mirrors src/routes/sync.ts) ---

const CATEGORY_COLUMNS = [
  'id', 'pair_id', 'name', 'icon', 'color', 'sort_order',
  'updated_at', 'deleted_at', 'server_version',
];
const CATEGORY_UPDATE = [
  'name', 'icon', 'color', 'sort_order', 'updated_at', 'deleted_at', 'server_version',
];

const ITEM_COLUMNS = [
  'id', 'pair_id', 'category_id', 'name', 'packages_count', 'items_count',
  'shelf_number', 'freeze_date', 'expiration_date', 'notes', 'photo_url',
  'updated_at', 'deleted_at', 'server_version',
];
const ITEM_UPDATE = [
  'category_id', 'name', 'packages_count', 'items_count', 'shelf_number',
  'freeze_date', 'expiration_date', 'notes', 'photo_url',
  'updated_at', 'deleted_at', 'server_version',
];

async function applyEntity(
  client: PoolClient,
  pairId: string,
  entity: any,
  table: string,
  columns: string[],
  updateColumns: string[]
): Promise<boolean> {
  const existing = await client.query(
    `SELECT * FROM ${table} WHERE id = $1 AND pair_id = $2`,
    [entity.id, pairId]
  );
  const serverRecord = existing.rows.length > 0 ? existing.rows[0] : null;

  if (!serverRecord) {
    const owner = await client.query(
      `SELECT pair_id FROM ${table} WHERE id = $1 LIMIT 1`,
      [entity.id]
    );
    if (owner.rows.length > 0 && owner.rows[0].pair_id !== pairId) return false;
  }

  const { winner } = resolveConflict(
    { updated_at: entity.updated_at, deleted_at: entity.deleted_at },
    serverRecord
      ? {
          updated_at: serverRecord.updated_at.toISOString(),
          deleted_at: serverRecord.deleted_at?.toISOString(),
        }
      : null
  );
  if (winner !== 'client') return false;

  const versionResult = await client.query(
    'UPDATE pairs SET server_version = server_version + 1 WHERE id = $1 RETURNING server_version',
    [pairId]
  );
  const newVersion = versionResult.rows[0].server_version;

  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const updateSet = updateColumns.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  const values = columns.map((c) => {
    if (c === 'pair_id') return pairId;
    if (c === 'server_version') return newVersion;
    return entity[c];
  });

  await client.query(
    `INSERT INTO ${table} (${columns.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (id) DO UPDATE SET ${updateSet}
     WHERE ${table}.pair_id = EXCLUDED.pair_id`,
    values
  );
  return true;
}

async function applyHistory(
  client: PoolClient,
  pairId: string,
  event: any
): Promise<boolean> {
  const existing = await client.query(
    'SELECT * FROM history_events WHERE id = $1 AND pair_id = $2',
    [event.id, pairId]
  );
  if (existing.rows.length > 0) return false; // append-only

  const owner = await client.query(
    'SELECT pair_id FROM history_events WHERE id = $1 LIMIT 1',
    [event.id]
  );
  if (owner.rows.length > 0 && owner.rows[0].pair_id !== pairId) return false;

  const versionResult = await client.query(
    'UPDATE pairs SET server_version = server_version + 1 WHERE id = $1 RETURNING server_version',
    [pairId]
  );
  const newVersion = versionResult.rows[0].server_version;

  await client.query(
    `INSERT INTO history_events
     (id, pair_id, type, item_id, category_id, item_name,
      packages_delta, items_delta, new_packages, new_items,
      timestamp, deleted_at, server_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      event.id, pairId, event.type, event.item_id || null,
      event.category_id || null, event.item_name, event.packages_delta,
      event.items_delta, event.new_packages, event.new_items,
      event.timestamp, event.deleted_at, newVersion,
    ]
  );
  return true;
}

function toISOString(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function getServerChanges(
  client: PoolClient,
  table: string,
  pairId: string,
  lastKnownVersion: number
): Promise<any[]> {
  const result = await client.query(
    `SELECT * FROM ${table} WHERE pair_id = $1 AND server_version > $2 ORDER BY server_version`,
    [pairId, lastKnownVersion]
  );
  return result.rows.map((row) => {
    const obj: any = { ...row };
    if (obj.updated_at) obj.updated_at = toISOString(obj.updated_at);
    if (obj.deleted_at) obj.deleted_at = toISOString(obj.deleted_at);
    if (obj.timestamp) obj.timestamp = toISOString(obj.timestamp);
    delete obj.pair_id;
    delete obj.created_at;
    delete obj.server_version;
    return snakeToCamel(obj);
  });
}

/** Run one full /sync transaction (apply client changes -> read back). */
async function runSync(
  pool: Pool,
  pairId: string,
  lastKnownVersion: number,
  changes: { categories?: any[]; items?: any[]; history?: any[] }
) {
  const client = await pool.connect();
  let applied = 0;
  try {
    await client.query('BEGIN');
    for (const raw of changes.categories || []) {
      const c = camelToSnake(raw) as any;
      if (await applyEntity(client, pairId, c, 'categories', CATEGORY_COLUMNS, CATEGORY_UPDATE)) applied++;
    }
    for (const raw of changes.items || []) {
      const i = camelToSnake(raw) as any;
      if (await applyEntity(client, pairId, i, 'items', ITEM_COLUMNS, ITEM_UPDATE)) applied++;
    }
    for (const raw of changes.history || []) {
      const e = camelToSnake(raw) as any;
      if (await applyHistory(client, pairId, e)) applied++;
    }

    const versionRow = await client.query(
      'SELECT server_version FROM pairs WHERE id = $1',
      [pairId]
    );
    const serverVersion = versionRow.rows[0].server_version;

    const serverCategories = await getServerChanges(client, 'categories', pairId, lastKnownVersion);
    const serverItems = await getServerChanges(client, 'items', pairId, lastKnownVersion);
    const serverHistory = await getServerChanges(client, 'history_events', pairId, lastKnownVersion);

    await client.query('COMMIT');

    return {
      server_version: String(serverVersion),
      applied_changes: applied,
      server_changes: {
        categories: serverCategories,
        items: serverItems,
        history: serverHistory,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-01T00:00:01.000Z';
const T2 = '2026-01-01T00:00:02.000Z';

function cat(id: string, name: string, updatedAt: string, deletedAt?: string) {
  return { id, name, icon: 'box', color: '#fff', sortOrder: 0, updatedAt, deletedAt };
}
function item(id: string, categoryId: string, name: string, updatedAt: string, extra: Record<string, any> = {}) {
  return {
    id, categoryId, name,
    packagesCount: 1, itemsCount: 1, shelfNumber: 1,
    freezeDate: '2026-01-01', expirationDate: '2026-06-01',
    updatedAt, ...extra,
  };
}

// Deterministic UUIDs to keep assertions readable.
const UID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe.skipIf(!hasTestDb)('POST /sync round-trip (live DB)', () => {
  let pool: Pool;
  let pairId: string;

  beforeEach(async () => {
    await acquireDbLock();
    await resetDb();
    pool = getPool();
    pairId = await seedPair(pool);
    const userId = await seedUser(pool);
    await seedMembership(pool, pairId, userId);
  });

  afterEach(async () => {
    await releaseDbLock();
  });

  afterAll(async () => {
    await closePool();
  });

  it('applies client changes, bumps server_version, returns correct shape', async () => {
    const catId = UID(1);
    const itId = UID(2);
    const res = await runSync(pool, pairId, 0, {
      categories: [cat(catId, 'Meat', T1)],
      items: [item(itId, catId, 'Chicken', T1)],
    });

    expect(res.applied_changes).toBe(2);
    // Two applies -> two version bumps from the initial 0.
    expect(res.server_version).toBe('2');

    // Envelope keys are snake_case.
    expect(res.server_changes).toHaveProperty('categories');
    expect(res.server_changes).toHaveProperty('items');
    expect(res.server_changes).toHaveProperty('history');

    // Entity keys are camelCase after snakeToCamel.
    const returnedItem = res.server_changes.items.find((i: any) => i.id === itId);
    expect(returnedItem).toBeDefined();
    expect(returnedItem).toHaveProperty('categoryId', catId);
    expect(returnedItem).toHaveProperty('packagesCount', 1);
    expect(returnedItem).toHaveProperty('updatedAt');
    // Server-only fields stripped from the wire payload.
    expect(returnedItem).not.toHaveProperty('pair_id');
    expect(returnedItem).not.toHaveProperty('serverVersion');
  });

  it('server_version is serialized as a STRING on the wire', async () => {
    const res = await runSync(pool, pairId, 0, {
      categories: [cat(UID(1), 'Meat', T1)],
    });
    expect(typeof res.server_version).toBe('string');
    expect(res.server_version).toBe('1');
  });

  it('LWW: a second sync with an OLDER updated_at loses', async () => {
    const catId = UID(1);
    await runSync(pool, pairId, 0, { categories: [cat(catId, 'Newer', T2)] });

    // Older update for the same id must NOT be applied.
    const res = await runSync(pool, pairId, 1, {
      categories: [cat(catId, 'Stale', T1)],
    });
    expect(res.applied_changes).toBe(0);

    const row = await pool.query('SELECT name FROM categories WHERE id = $1', [catId]);
    expect(row.rows[0].name).toBe('Newer');
  });

  it('LWW: a newer updated_at wins and overwrites', async () => {
    const catId = UID(1);
    await runSync(pool, pairId, 0, { categories: [cat(catId, 'Old', T0)] });

    const res = await runSync(pool, pairId, 1, {
      categories: [cat(catId, 'Fresh', T2)],
    });
    expect(res.applied_changes).toBe(1);

    const row = await pool.query('SELECT name FROM categories WHERE id = $1', [catId]);
    expect(row.rows[0].name).toBe('Fresh');
  });

  it('soft-delete via deleted_at propagates to server_changes', async () => {
    const catId = UID(1);
    const itId = UID(2);
    await runSync(pool, pairId, 0, {
      categories: [cat(catId, 'Meat', T0)],
      items: [item(itId, catId, 'Chicken', T0)],
    });

    // Delete the item with a newer timestamp; LWW means the delete wins.
    const res = await runSync(pool, pairId, 0, {
      items: [item(itId, catId, 'Chicken', T2, { deletedAt: T2 })],
    });
    expect(res.applied_changes).toBe(1);

    const returned = res.server_changes.items.find((i: any) => i.id === itId);
    expect(returned).toBeDefined();
    expect(returned.deletedAt).toBeTruthy();

    const row = await pool.query('SELECT deleted_at FROM items WHERE id = $1', [itId]);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  it('two sequential syncs keep server_version strictly monotonic', async () => {
    const r1 = await runSync(pool, pairId, 0, { categories: [cat(UID(1), 'A', T0)] });
    const r2 = await runSync(pool, pairId, Number(r1.server_version), {
      categories: [cat(UID(2), 'B', T0)],
    });
    const r3 = await runSync(pool, pairId, Number(r2.server_version), {
      items: [item(UID(3), UID(1), 'C', T0)],
    });

    const v1 = Number(r1.server_version);
    const v2 = Number(r2.server_version);
    const v3 = Number(r3.server_version);
    expect(v2).toBeGreaterThan(v1);
    expect(v3).toBeGreaterThan(v2);
  });

  it('history events are append-only (re-syncing the same id is a no-op)', async () => {
    const histId = UID(10);
    const ev = {
      id: histId,
      type: 'item_added',
      itemId: UID(2),
      categoryId: UID(1),
      itemName: 'Chicken',
      packagesDelta: 1,
      itemsDelta: 1,
      timestamp: T1,
    };
    const first = await runSync(pool, pairId, 0, { history: [ev] });
    expect(first.applied_changes).toBe(1);

    const second = await runSync(pool, pairId, Number(first.server_version), {
      history: [ev],
    });
    expect(second.applied_changes).toBe(0);

    const count = await pool.query(
      'SELECT COUNT(*)::int AS c FROM history_events WHERE id = $1',
      [histId]
    );
    expect(count.rows[0].c).toBe(1);
  });

  it('rejects cross-pair writes for an id owned by another pair', async () => {
    const otherPair = await seedPair(pool, 'Other Freezer');
    const sharedId = UID(99);

    // Seed a category owned by the OTHER pair.
    await runSync(pool, otherPair, 0, { categories: [cat(sharedId, 'TheirCat', T1)] });

    // Our pair tries to write the same id -> must be refused.
    const res = await runSync(pool, pairId, 0, {
      categories: [cat(sharedId, 'OurCat', T2)],
    });
    expect(res.applied_changes).toBe(0);

    const row = await pool.query(
      'SELECT name, pair_id FROM categories WHERE id = $1',
      [sharedId]
    );
    expect(row.rows[0].name).toBe('TheirCat');
    expect(row.rows[0].pair_id).toBe(otherPair);
  });
});
