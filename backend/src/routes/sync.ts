import { FastifyPluginAsync } from 'fastify';
import { PoolClient } from 'pg';
import db from '../config/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { SyncRequest, SyncResponse, Category, Item, HistoryEvent } from '../models/types.js';
import { resolveConflict } from '../services/conflict-resolver.js';

const syncRoutes: FastifyPluginAsync = async (server) => {
  // POST /sync
  server.post<{ Body: SyncRequest; Reply: SyncResponse }>(
    '',
    {
      onRequest: [authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['last_known_version', 'changes'],
          properties: {
            last_known_version: { type: 'number' },
            changes: {
              type: 'object',
              properties: {
                categories: { type: 'array' },
                items: { type: 'array' },
                history: { type: 'array' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { pairId } = (request as AuthenticatedRequest).user;
      const { last_known_version, changes } = request.body;

      const client = await db.connect();
      let appliedChangesCount = 0;

      try {
        await client.query('BEGIN');

        // Process categories
        for (const category of changes.categories || []) {
          const applied = await processCategory(client, pairId, category);
          if (applied) appliedChangesCount++;
        }

        // Process items
        for (const item of changes.items || []) {
          const applied = await processItem(client, pairId, item);
          if (applied) appliedChangesCount++;
        }

        // Process history events
        for (const event of changes.history || []) {
          const applied = await processHistoryEvent(client, pairId, event);
          if (applied) appliedChangesCount++;
        }

        // Get current server version
        const versionResult = await client.query(
          'SELECT server_version FROM pairs WHERE id = $1',
          [pairId]
        );
        const currentServerVersion = versionResult.rows[0].server_version;

        // Get all changes since client's last known version
        const serverCategories = await getServerChanges<Category>(
          client,
          'categories',
          pairId,
          last_known_version
        );

        const serverItems = await getServerChanges<Item>(
          client,
          'items',
          pairId,
          last_known_version
        );

        const serverHistory = await getServerChanges<HistoryEvent>(
          client,
          'history_events',
          pairId,
          last_known_version
        );

        await client.query('COMMIT');

        return {
          server_version: currentServerVersion,
          applied_changes: appliedChangesCount,
          server_changes: {
            categories: serverCategories,
            items: serverItems,
            history: serverHistory,
          },
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  );

  // GET /sync/status
  server.get(
    '/status',
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const { pairId } = (request as AuthenticatedRequest).user;

      const result = await db.query(
        `SELECT p.server_version, p.updated_at,
                (SELECT COUNT(*) FROM pair_members WHERE pair_id = p.id) as members_count
         FROM pairs p
         WHERE p.id = $1`,
        [pairId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Pair not found' });
      }

      const row = result.rows[0];

      return {
        server_version: row.server_version,
        pair_id: pairId,
        members_count: parseInt(row.members_count),
        last_activity: row.updated_at.toISOString(),
      };
    }
  );
};

// Helper functions

async function processCategory(
  client: PoolClient,
  pairId: string,
  category: Category
): Promise<boolean> {
  // Check if record exists on server
  const existingResult = await client.query(
    'SELECT * FROM categories WHERE id = $1 AND pair_id = $2',
    [category.id, pairId]
  );

  const serverRecord = existingResult.rows.length > 0
    ? existingResult.rows[0]
    : null;

  // Resolve conflict using Last-Write-Wins
  const { winner } = resolveConflict(
    {
      updated_at: category.updated_at,
      deleted_at: category.deleted_at,
    },
    serverRecord ? {
      updated_at: serverRecord.updated_at.toISOString(),
      deleted_at: serverRecord.deleted_at?.toISOString(),
    } : null
  );

  if (winner === 'client') {
    // Increment pair server version
    await client.query(
      'UPDATE pairs SET server_version = server_version + 1 WHERE id = $1',
      [pairId]
    );

    // Get new server version
    const versionResult = await client.query(
      'SELECT server_version FROM pairs WHERE id = $1',
      [pairId]
    );
    const newServerVersion = versionResult.rows[0].server_version;

    // Upsert category
    await client.query(
      `INSERT INTO categories
       (id, pair_id, name, icon, color, sort_order, updated_at, deleted_at, server_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         icon = EXCLUDED.icon,
         color = EXCLUDED.color,
         sort_order = EXCLUDED.sort_order,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at,
         server_version = EXCLUDED.server_version`,
      [
        category.id,
        pairId,
        category.name,
        category.icon,
        category.color,
        category.sort_order,
        category.updated_at,
        category.deleted_at,
        newServerVersion,
      ]
    );

    return true;
  }

  return false; // Server won, no changes applied
}

async function processItem(
  client: PoolClient,
  pairId: string,
  item: Item
): Promise<boolean> {
  const existingResult = await client.query(
    'SELECT * FROM items WHERE id = $1 AND pair_id = $2',
    [item.id, pairId]
  );

  const serverRecord = existingResult.rows.length > 0
    ? existingResult.rows[0]
    : null;

  const { winner } = resolveConflict(
    {
      updated_at: item.updated_at,
      deleted_at: item.deleted_at,
    },
    serverRecord ? {
      updated_at: serverRecord.updated_at.toISOString(),
      deleted_at: serverRecord.deleted_at?.toISOString(),
    } : null
  );

  if (winner === 'client') {
    await client.query(
      'UPDATE pairs SET server_version = server_version + 1 WHERE id = $1',
      [pairId]
    );

    const versionResult = await client.query(
      'SELECT server_version FROM pairs WHERE id = $1',
      [pairId]
    );
    const newServerVersion = versionResult.rows[0].server_version;

    await client.query(
      `INSERT INTO items
       (id, pair_id, category_id, name, packages_count, items_count, shelf_number,
        freeze_date, expiration_date, notes, photo_url, updated_at, deleted_at, server_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         category_id = EXCLUDED.category_id,
         name = EXCLUDED.name,
         packages_count = EXCLUDED.packages_count,
         items_count = EXCLUDED.items_count,
         shelf_number = EXCLUDED.shelf_number,
         freeze_date = EXCLUDED.freeze_date,
         expiration_date = EXCLUDED.expiration_date,
         notes = EXCLUDED.notes,
         photo_url = EXCLUDED.photo_url,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at,
         server_version = EXCLUDED.server_version`,
      [
        item.id,
        pairId,
        item.category_id,
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
        newServerVersion,
      ]
    );

    return true;
  }

  return false;
}

async function processHistoryEvent(
  client: PoolClient,
  pairId: string,
  event: HistoryEvent
): Promise<boolean> {
  const existingResult = await client.query(
    'SELECT * FROM history_events WHERE id = $1 AND pair_id = $2',
    [event.id, pairId]
  );

  // History events are append-only, only insert if doesn't exist
  if (existingResult.rows.length === 0) {
    await client.query(
      'UPDATE pairs SET server_version = server_version + 1 WHERE id = $1',
      [pairId]
    );

    const versionResult = await client.query(
      'SELECT server_version FROM pairs WHERE id = $1',
      [pairId]
    );
    const newServerVersion = versionResult.rows[0].server_version;

    await client.query(
      `INSERT INTO history_events
       (id, pair_id, type, item_id, category_id, item_name,
        packages_delta, items_delta, new_packages, new_items,
        timestamp, deleted_at, server_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        event.id,
        pairId,
        event.type,
        event.item_id,
        event.category_id,
        event.item_name,
        event.packages_delta,
        event.items_delta,
        event.new_packages,
        event.new_items,
        event.timestamp,
        event.deleted_at,
        newServerVersion,
      ]
    );

    return true;
  }

  return false;
}

async function getServerChanges<T>(
  client: PoolClient,
  tableName: string,
  pairId: string,
  lastKnownVersion: number
): Promise<T[]> {
  const result = await client.query(
    `SELECT * FROM ${tableName}
     WHERE pair_id = $1 AND server_version > $2
     ORDER BY server_version`,
    [pairId, lastKnownVersion]
  );

  return result.rows.map((row) => {
    const obj: any = { ...row };

    // Convert dates to ISO strings
    if (obj.freeze_date) obj.freeze_date = obj.freeze_date.toISOString().split('T')[0];
    if (obj.expiration_date) obj.expiration_date = obj.expiration_date.toISOString().split('T')[0];
    if (obj.updated_at) obj.updated_at = obj.updated_at.toISOString();
    if (obj.deleted_at) obj.deleted_at = obj.deleted_at.toISOString();
    if (obj.timestamp) obj.timestamp = obj.timestamp.toISOString();

    // Remove server-only fields
    delete obj.pair_id;
    delete obj.created_at;

    return obj as T;
  });
}

export default syncRoutes;
