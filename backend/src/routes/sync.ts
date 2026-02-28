import { FastifyPluginAsync } from 'fastify';
import { PoolClient } from 'pg';
import db from '../config/database.js';
import { authenticateWithActivePair, AuthenticatedRequest } from '../middleware/auth.js';
import { SyncRequest, SyncResponse, Category, Item, HistoryEvent } from '../models/types.js';
import { resolveConflict } from '../services/conflict-resolver.js';
import { camelToSnake, snakeToCamel } from '../utils/key-transform.js';

const syncRoutes: FastifyPluginAsync = async (server) => {
  // POST /sync
  server.post<{ Body: SyncRequest; Reply: SyncResponse }>(
    '',
    {
      onRequest: [authenticateWithActivePair],
      schema: {
        body: {
          type: 'object',
          required: [],
          properties: {
            last_known_version: { type: 'number' },
            lastKnownVersion: { type: 'number' },
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
      const pairId = (request as AuthenticatedRequest).user.activePairId!;
      const body = request.body as any;

      // Accept both camelCase and snake_case for last_known_version
      const last_known_version = body.last_known_version ?? body.lastKnownVersion ?? 0;
      const changes = body.changes || { categories: [], items: [], history: [] };

      const client = await db.connect();
      let appliedChangesCount = 0;

      try {
        await client.query('BEGIN');

        // Process categories — transform from camelCase to snake_case
        for (const rawCategory of changes.categories || []) {
          const category = camelToSnake(rawCategory) as any;
          const applied = await processCategory(client, pairId, category);
          if (applied) appliedChangesCount++;
        }

        // Process items — transform from camelCase to snake_case
        for (const rawItem of changes.items || []) {
          const item = camelToSnake(rawItem) as any;
          const applied = await processItem(client, pairId, item);
          if (applied) appliedChangesCount++;
        }

        // Process history events — transform from camelCase to snake_case
        for (const rawEvent of changes.history || []) {
          const event = camelToSnake(rawEvent) as any;
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
        const serverCategories = await getServerChanges(
          client,
          'categories',
          pairId,
          last_known_version
        );

        const serverItems = await getServerChanges(
          client,
          'items',
          pairId,
          last_known_version
        );

        const serverHistory = await getServerChanges(
          client,
          'history_events',
          pairId,
          last_known_version
        );

        await client.query('COMMIT');

        // Top-level keys are snake_case (iOS CodingKeys map them)
        // Entity-level keys are camelCase (iOS models have no CodingKeys)
        return {
          server_version: String(currentServerVersion),
          applied_changes: appliedChangesCount,
          server_changes: {
            categories: serverCategories,
            items: serverItems,
            history: serverHistory,
          },
        } as any;
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
      onRequest: [authenticateWithActivePair],
    },
    async (request, reply) => {
      const pairId = (request as AuthenticatedRequest).user.activePairId!;

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
        server_version: String(row.server_version),
        pair_id: pairId,
        members_count: parseInt(row.members_count),
        last_activity: row.updated_at.toISOString(),
      };
    }
  );
};

// Helper functions

interface EntityUpsertConfig {
  table: string;
  columns: string[];
  updateColumns: string[];
}

const CATEGORY_CONFIG: EntityUpsertConfig = {
  table: 'categories',
  columns: ['id', 'pair_id', 'name', 'icon', 'color', 'sort_order', 'updated_at', 'deleted_at', 'server_version'],
  updateColumns: ['name', 'icon', 'color', 'sort_order', 'updated_at', 'deleted_at', 'server_version'],
};

const ITEM_CONFIG: EntityUpsertConfig = {
  table: 'items',
  columns: [
    'id', 'pair_id', 'category_id', 'name', 'packages_count', 'items_count',
    'shelf_number', 'freeze_date', 'expiration_date', 'notes', 'photo_url',
    'updated_at', 'deleted_at', 'server_version',
  ],
  updateColumns: [
    'category_id', 'name', 'packages_count', 'items_count', 'shelf_number',
    'freeze_date', 'expiration_date', 'notes', 'photo_url',
    'updated_at', 'deleted_at', 'server_version',
  ],
};

async function processEntity(
  client: PoolClient,
  pairId: string,
  entity: any,
  config: EntityUpsertConfig
): Promise<boolean> {
  const existingResult = await client.query(
    `SELECT * FROM ${config.table} WHERE id = $1 AND pair_id = $2`,
    [entity.id, pairId]
  );

  const serverRecord = existingResult.rows.length > 0
    ? existingResult.rows[0]
    : null;

  // Prevent cross-pair writes
  if (!serverRecord) {
    const idOwnerResult = await client.query(
      `SELECT pair_id FROM ${config.table} WHERE id = $1 LIMIT 1`,
      [entity.id]
    );
    if (idOwnerResult.rows.length > 0 && idOwnerResult.rows[0].pair_id !== pairId) {
      return false;
    }
  }

  const { winner } = resolveConflict(
    {
      updated_at: entity.updated_at,
      deleted_at: entity.deleted_at,
    },
    serverRecord ? {
      updated_at: serverRecord.updated_at.toISOString(),
      deleted_at: serverRecord.deleted_at?.toISOString(),
    } : null
  );

  if (winner !== 'client') return false;

  const versionResult = await client.query(
    'UPDATE pairs SET server_version = server_version + 1 WHERE id = $1 RETURNING server_version',
    [pairId]
  );
  const newServerVersion = versionResult.rows[0].server_version;

  const placeholders = config.columns.map((_, i) => `$${i + 1}`).join(', ');
  const updateSet = config.updateColumns
    .map((col) => `${col} = EXCLUDED.${col}`)
    .join(', ');

  const values = config.columns.map((col) => {
    if (col === 'pair_id') return pairId;
    if (col === 'server_version') return newServerVersion;
    return entity[col];
  });

  await client.query(
    `INSERT INTO ${config.table} (${config.columns.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (id) DO UPDATE SET ${updateSet}
     WHERE ${config.table}.pair_id = EXCLUDED.pair_id`,
    values
  );

  return true;
}

async function processCategory(
  client: PoolClient,
  pairId: string,
  category: any
): Promise<boolean> {
  return processEntity(client, pairId, category, CATEGORY_CONFIG);
}

async function processItem(
  client: PoolClient,
  pairId: string,
  item: any
): Promise<boolean> {
  return processEntity(client, pairId, item, ITEM_CONFIG);
}

async function processHistoryEvent(
  client: PoolClient,
  pairId: string,
  event: any
): Promise<boolean> {
  const existingResult = await client.query(
    'SELECT * FROM history_events WHERE id = $1 AND pair_id = $2',
    [event.id, pairId]
  );

  // History events are append-only, only insert if doesn't exist in the same pair.
  if (existingResult.rows.length === 0) {
    const idOwnerResult = await client.query(
      'SELECT pair_id FROM history_events WHERE id = $1 LIMIT 1',
      [event.id]
    );
    if (idOwnerResult.rows.length > 0 && idOwnerResult.rows[0].pair_id !== pairId) {
      return false;
    }

    const versionResult = await client.query(
      'UPDATE pairs SET server_version = server_version + 1 WHERE id = $1 RETURNING server_version',
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
        event.item_id || null,
        event.category_id || null,
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

/** Format a date field as full ISO 8601 timestamp */
function formatDateISO(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  // If it's already a string, ensure it's a full timestamp
  const str = String(value);
  if (str.length === 10) return str + 'T00:00:00.000Z'; // date-only -> full ISO
  return str;
}

function toISOString(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function getServerChanges(
  client: PoolClient,
  tableName: string,
  pairId: string,
  lastKnownVersion: number
): Promise<any[]> {
  const result = await client.query(
    `SELECT * FROM ${tableName}
     WHERE pair_id = $1 AND server_version > $2
     ORDER BY server_version`,
    [pairId, lastKnownVersion]
  );

  return result.rows.map((row) => {
    const obj: any = { ...row };

    // Convert dates to full ISO 8601 timestamps
    if (obj.freeze_date) obj.freeze_date = formatDateISO(obj.freeze_date);
    if (obj.expiration_date) obj.expiration_date = formatDateISO(obj.expiration_date);
    if (obj.updated_at) obj.updated_at = toISOString(obj.updated_at);
    if (obj.deleted_at) obj.deleted_at = toISOString(obj.deleted_at);
    if (obj.timestamp) obj.timestamp = toISOString(obj.timestamp);

    // Remove server-only fields
    delete obj.pair_id;
    delete obj.created_at;
    delete obj.server_version;

    // Table-specific fixes
    if (tableName === 'categories') {
      // iOS Category model requires itemCount (non-optional Int)
      obj.item_count = 0;
    }

    if (tableName === 'items') {
      // iOS Item model has categoryId as non-optional String
      if (!obj.category_id) obj.category_id = '';
    }

    if (tableName === 'history_events') {
      // iOS HistoryEvent model has updatedAt as non-optional Date
      // history_events table has no updated_at column, so use timestamp
      obj.updated_at = obj.timestamp;
    }

    // Convert snake_case keys to camelCase for iOS (models have no CodingKeys)
    return snakeToCamel(obj);
  });
}

export default syncRoutes;
