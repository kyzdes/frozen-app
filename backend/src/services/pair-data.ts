import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';

export interface PairSyncData {
  categories: any[];
  items: any[];
  history: any[];
}

/** Format a date field as full ISO 8601 timestamp */
export function formatDateISO(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const str = String(value);
  if (str.length === 10) return `${str}T00:00:00.000Z`;
  return str;
}

export function toISOString(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function loadPairSyncData(client: PoolClient, pairId: string): Promise<PairSyncData> {
  const categoriesResult = await client.query(
    `SELECT id, name, icon, color, sort_order, updated_at, deleted_at
     FROM categories
     WHERE pair_id = $1 AND deleted_at IS NULL
     ORDER BY sort_order`,
    [pairId]
  );

  const itemsResult = await client.query(
    `SELECT id, category_id, name, packages_count, items_count, shelf_number,
            freeze_date, expiration_date, notes, photo_url,
            updated_at, deleted_at
     FROM items
     WHERE pair_id = $1 AND deleted_at IS NULL
     ORDER BY name`,
    [pairId]
  );

  const historyResult = await client.query(
    `SELECT id, type, item_id, category_id, item_name,
            packages_delta, items_delta, new_packages, new_items,
            timestamp, deleted_at
     FROM history_events
     WHERE pair_id = $1 AND deleted_at IS NULL
     ORDER BY timestamp DESC
     LIMIT 500`,
    [pairId]
  );

  return {
    categories: categoriesResult.rows.map((row: any) => ({
      ...row,
      updated_at: toISOString(row.updated_at),
      deleted_at: toISOString(row.deleted_at),
      item_count: 0,
    })),
    items: itemsResult.rows.map((row: any) => ({
      ...row,
      category_id: row.category_id || '',
      freeze_date: formatDateISO(row.freeze_date),
      expiration_date: formatDateISO(row.expiration_date),
      updated_at: toISOString(row.updated_at),
      deleted_at: toISOString(row.deleted_at),
    })),
    history: historyResult.rows.map((row: any) => {
      const timestamp = toISOString(row.timestamp);
      return {
        ...row,
        timestamp,
        updated_at: timestamp,
        deleted_at: toISOString(row.deleted_at),
      };
    }),
  };
}

export async function copyPairSnapshot(
  client: PoolClient,
  sourcePairId: string,
  targetPairId: string
): Promise<number> {
  const versionResult = await client.query(
    'SELECT server_version FROM pairs WHERE id = $1 FOR UPDATE',
    [targetPairId]
  );

  let nextVersion = Number(versionResult.rows[0]?.server_version || 0);
  let copiedRows = 0;

  const categoriesResult = await client.query(
    `SELECT id, name, icon, color, sort_order, updated_at, deleted_at
     FROM categories
     WHERE pair_id = $1`,
    [sourcePairId]
  );

  const categoryIdMap = new Map<string, string>();

  for (const category of categoriesResult.rows) {
    const newId = randomUUID();
    categoryIdMap.set(category.id, newId);
    nextVersion += 1;
    copiedRows += 1;

    await client.query(
      `INSERT INTO categories
       (id, pair_id, name, icon, color, sort_order, updated_at, deleted_at, server_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        newId,
        targetPairId,
        category.name,
        category.icon,
        category.color,
        category.sort_order,
        category.updated_at,
        category.deleted_at,
        nextVersion,
      ]
    );
  }

  const itemsResult = await client.query(
    `SELECT id, category_id, name, packages_count, items_count, shelf_number,
            freeze_date, expiration_date, notes, photo_url, updated_at, deleted_at
     FROM items
     WHERE pair_id = $1`,
    [sourcePairId]
  );

  const itemIdMap = new Map<string, string>();

  for (const item of itemsResult.rows) {
    const newId = randomUUID();
    itemIdMap.set(item.id, newId);
    nextVersion += 1;
    copiedRows += 1;

    await client.query(
      `INSERT INTO items
       (id, pair_id, category_id, name, packages_count, items_count, shelf_number,
        freeze_date, expiration_date, notes, photo_url, updated_at, deleted_at, server_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        newId,
        targetPairId,
        item.category_id ? (categoryIdMap.get(item.category_id) || null) : null,
        item.name,
        item.packages_count,
        item.items_count,
        item.shelf_number,
        item.freeze_date,
        item.expiration_date,
        item.notes,
        item.photo_url,
        item.updated_at,
        item.deleted_at,
        nextVersion,
      ]
    );
  }

  const historyResult = await client.query(
    `SELECT id, type, item_id, category_id, item_name,
            packages_delta, items_delta, new_packages, new_items,
            timestamp, deleted_at
     FROM history_events
     WHERE pair_id = $1`,
    [sourcePairId]
  );

  for (const event of historyResult.rows) {
    const newId = randomUUID();
    nextVersion += 1;
    copiedRows += 1;

    await client.query(
      `INSERT INTO history_events
       (id, pair_id, type, item_id, category_id, item_name,
        packages_delta, items_delta, new_packages, new_items,
        timestamp, deleted_at, server_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        newId,
        targetPairId,
        event.type,
        event.item_id ? (itemIdMap.get(event.item_id) || null) : null,
        event.category_id ? (categoryIdMap.get(event.category_id) || null) : null,
        event.item_name,
        event.packages_delta,
        event.items_delta,
        event.new_packages,
        event.new_items,
        event.timestamp,
        event.deleted_at,
        nextVersion,
      ]
    );
  }

  await client.query('UPDATE pairs SET server_version = $2 WHERE id = $1', [targetPairId, nextVersion]);

  return copiedRows;
}
