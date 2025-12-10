import { FastifyPluginAsync } from 'fastify';
import db from '../config/database.js';
import { generateInviteCode } from '../utils/invite-code.js';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';
import {
  CreatePairRequest,
  CreatePairResponse,
  JoinPairRequest,
  JoinPairResponse,
} from '../models/types.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const pairRoutes: FastifyPluginAsync = async (server) => {
  // POST /pair/create
  server.post<{ Body: CreatePairRequest; Reply: CreatePairResponse }>(
    '/create',
    {
      schema: {
        body: {
          type: 'object',
          required: ['device_id'],
          properties: {
            device_id: { type: 'string' },
            pair_name: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { device_id, pair_name = 'Мой холодильник' } = request.body;

      if (!device_id || device_id.trim().length === 0) {
        throw new ValidationError('device_id is required');
      }

      const client = await db.connect();

      try {
        await client.query('BEGIN');

        // Create or get user
        let userId: string;
        const userResult = await client.query(
          'SELECT id FROM users WHERE device_id = $1',
          [device_id]
        );

        if (userResult.rows.length > 0) {
          userId = userResult.rows[0].id;
        } else {
          const newUserResult = await client.query(
            'INSERT INTO users (device_id) VALUES ($1) RETURNING id',
            [device_id]
          );
          userId = newUserResult.rows[0].id;
        }

        // Check if user already has a pair
        const existingPairResult = await client.query(
          'SELECT pair_id FROM pair_members WHERE user_id = $1',
          [userId]
        );

        if (existingPairResult.rows.length > 0) {
          throw new ConflictError(
            'User already belongs to a pair. Leave the current pair first.'
          );
        }

        // Create pair
        const pairResult = await client.query(
          'INSERT INTO pairs (name, server_version) VALUES ($1, 0) RETURNING id, server_version',
          [pair_name]
        );
        const pairId = pairResult.rows[0].id;
        const serverVersion = pairResult.rows[0].server_version;

        // Add user as owner
        await client.query(
          'INSERT INTO pair_members (pair_id, user_id, role) VALUES ($1, $2, $3)',
          [pairId, userId, 'owner']
        );

        // Generate unique invite code
        let inviteCode: string;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          inviteCode = generateInviteCode();
          const existingCode = await client.query(
            'SELECT code FROM invites WHERE code = $1 AND used_at IS NULL',
            [inviteCode]
          );

          if (existingCode.rows.length === 0) {
            break;
          }
          attempts++;
        }

        if (attempts === maxAttempts) {
          throw new Error('Failed to generate unique invite code');
        }

        // Create invite
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await client.query(
          'INSERT INTO invites (code, pair_id, created_by, expires_at) VALUES ($1, $2, $3, $4)',
          [inviteCode!, pairId, userId, expiresAt]
        );

        await client.query('COMMIT');

        // Generate JWT token
        const token = server.jwt.sign({
          userId,
          pairId,
          deviceId: device_id,
        });

        return {
          pair_id: pairId,
          user_id: userId,
          invite_code: inviteCode!,
          invite_expires_at: expiresAt.toISOString(),
          token,
          server_version: serverVersion,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  );

  // POST /pair/join
  server.post<{ Body: JoinPairRequest; Reply: JoinPairResponse }>(
    '/join',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['device_id', 'invite_code'],
          properties: {
            device_id: { type: 'string' },
            invite_code: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { device_id, invite_code } = request.body;

      if (!device_id || !invite_code) {
        throw new ValidationError('device_id and invite_code are required');
      }

      const code = invite_code.toUpperCase().trim();

      const client = await db.connect();

      try {
        await client.query('BEGIN');

        // Validate invite code
        const inviteResult = await client.query(
          `SELECT i.pair_id, i.expires_at, i.used_at
           FROM invites i
           WHERE i.code = $1`,
          [code]
        );

        if (inviteResult.rows.length === 0) {
          throw new NotFoundError('Invalid invite code');
        }

        const invite = inviteResult.rows[0];

        if (invite.used_at) {
          throw new ConflictError('Invite code already used');
        }

        if (new Date(invite.expires_at) < new Date()) {
          throw new ConflictError('Invite code expired');
        }

        const pairId = invite.pair_id;

        // Check if pair is full (max 2 members)
        const memberCountResult = await client.query(
          'SELECT COUNT(*) as count FROM pair_members WHERE pair_id = $1',
          [pairId]
        );

        if (parseInt(memberCountResult.rows[0].count) >= 2) {
          throw new ConflictError('Pair is full (maximum 2 members)');
        }

        // Create or get user
        let userId: string;
        const userResult = await client.query(
          'SELECT id FROM users WHERE device_id = $1',
          [device_id]
        );

        if (userResult.rows.length > 0) {
          userId = userResult.rows[0].id;

          // Check if user already in another pair
          const existingPairResult = await client.query(
            'SELECT pair_id FROM pair_members WHERE user_id = $1',
            [userId]
          );

          if (existingPairResult.rows.length > 0) {
            throw new ConflictError(
              'User already belongs to a pair. Leave the current pair first.'
            );
          }
        } else {
          const newUserResult = await client.query(
            'INSERT INTO users (device_id) VALUES ($1) RETURNING id',
            [device_id]
          );
          userId = newUserResult.rows[0].id;
        }

        // Add user to pair
        await client.query(
          'INSERT INTO pair_members (pair_id, user_id, role) VALUES ($1, $2, $3)',
          [pairId, userId, 'member']
        );

        // Mark invite as used
        await client.query(
          'UPDATE invites SET used_by = $1, used_at = NOW() WHERE code = $2',
          [userId, code]
        );

        // Get current server version
        const versionResult = await client.query(
          'SELECT server_version FROM pairs WHERE id = $1',
          [pairId]
        );
        const serverVersion = versionResult.rows[0].server_version;

        // Get all data for initial sync
        const categoriesResult = await client.query(
          `SELECT id, name, icon, color, sort_order, updated_at, deleted_at, server_version
           FROM categories
           WHERE pair_id = $1
           ORDER BY server_version`,
          [pairId]
        );

        const itemsResult = await client.query(
          `SELECT id, category_id, name, packages_count, items_count, shelf_number,
                  freeze_date, expiration_date, notes, photo_url,
                  updated_at, deleted_at, server_version
           FROM items
           WHERE pair_id = $1
           ORDER BY server_version`,
          [pairId]
        );

        const historyResult = await client.query(
          `SELECT id, type, item_id, category_id, item_name,
                  packages_delta, items_delta, new_packages, new_items,
                  timestamp, deleted_at, server_version
           FROM history_events
           WHERE pair_id = $1
           ORDER BY server_version
           LIMIT 500`,
          [pairId]
        );

        await client.query('COMMIT');

        // Generate JWT token
        const token = server.jwt.sign({
          userId,
          pairId,
          deviceId: device_id,
        });

        return {
          pair_id: pairId,
          user_id: userId,
          token,
          server_version: serverVersion,
          initial_data: {
            categories: categoriesResult.rows.map((row) => ({
              ...row,
              freeze_date: row.freeze_date?.toISOString().split('T')[0],
              expiration_date: row.expiration_date?.toISOString().split('T')[0],
              updated_at: row.updated_at.toISOString(),
              deleted_at: row.deleted_at?.toISOString(),
            })),
            items: itemsResult.rows.map((row) => ({
              ...row,
              freeze_date: row.freeze_date.toISOString().split('T')[0],
              expiration_date: row.expiration_date.toISOString().split('T')[0],
              updated_at: row.updated_at.toISOString(),
              deleted_at: row.deleted_at?.toISOString(),
            })),
            history: historyResult.rows.map((row) => ({
              ...row,
              timestamp: row.timestamp.toISOString(),
              deleted_at: row.deleted_at?.toISOString(),
            })),
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

  // POST /pair/leave
  server.post(
    '/leave',
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const { userId, pairId } = (request as AuthenticatedRequest).user;

      const client = await db.connect();

      try {
        await client.query('BEGIN');

        // Remove user from pair
        await client.query(
          'DELETE FROM pair_members WHERE pair_id = $1 AND user_id = $2',
          [pairId, userId]
        );

        // Check if pair is now empty
        const remainingMembersResult = await client.query(
          'SELECT COUNT(*) as count FROM pair_members WHERE pair_id = $1',
          [pairId]
        );

        // If no members left, delete the pair (CASCADE will delete all data)
        if (parseInt(remainingMembersResult.rows[0].count) === 0) {
          await client.query('DELETE FROM pairs WHERE id = $1', [pairId]);
        }

        await client.query('COMMIT');

        return { success: true };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  );
};

export default pairRoutes;
