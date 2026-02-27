import { FastifyPluginAsync } from 'fastify';
import db from '../config/database.js';
import { generateInviteCode } from '../utils/invite-code.js';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AppError,
} from '../utils/errors.js';
import {
  CreatePairRequest,
  CreatePairResponse,
  JoinPairRequest,
  JoinPairResponse,
  LeavePairResponse,
} from '../models/types.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { snakeToCamel } from '../utils/key-transform.js';
import { AuthService } from '../services/auth.js';
import { copyPairSnapshot, loadPairSyncData } from '../services/pair-data.js';

const pairRoutes: FastifyPluginAsync = async (server) => {
  const authService = new AuthService(server);

  async function createPersonalPair(client: any, userId: string, pairName: string) {
    const pairResult = await client.query(
      'INSERT INTO pairs (name, server_version) VALUES ($1, 0) RETURNING id, server_version',
      [pairName]
    );

    const pairId = pairResult.rows[0].id as string;
    await client.query(
      'INSERT INTO pair_members (pair_id, user_id, role) VALUES ($1, $2, $3)',
      [pairId, userId, 'owner']
    );

    return {
      pairId,
      serverVersion: Number(pairResult.rows[0].server_version),
    };
  }

  async function createInvite(client: any, pairId: string, userId: string) {
    let inviteCode = '';
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
      attempts += 1;
    }

    if (attempts === maxAttempts) {
      throw new AppError(500, 'Failed to generate unique invite code', 'INVITE_GENERATION_FAILED');
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await client.query(
      'INSERT INTO invites (code, pair_id, created_by, expires_at) VALUES ($1, $2, $3, $4)',
      [inviteCode, pairId, userId, expiresAt]
    );

    return {
      inviteCode,
      expiresAt,
    };
  }

  // POST /pair/create
  server.post<{ Body: CreatePairRequest; Reply: CreatePairResponse }>(
    '/create',
    {
      onRequest: [authenticateUser],
      schema: {
        body: {
          type: 'object',
          properties: {
            pair_name: { type: 'string', minLength: 1, maxLength: 120 },
          },
        },
      },
    },
    async (request) => {
      const { userId, sessionId } = (request as AuthenticatedRequest).user;
      const requestedPairName = request.body?.pair_name?.trim();
      const client = await db.connect();

      try {
        await client.query('BEGIN');

        const userResult = await client.query(
          `SELECT id, active_pair_id, personal_pair_id
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new NotFoundError('User not found');
        }

        const user = userResult.rows[0] as any;

        let pairId = user.active_pair_id as string | null;
        if (!pairId) {
          const created = await createPersonalPair(client, userId, requestedPairName || 'Мой холодильник');
          pairId = created.pairId;

          await client.query(
            `UPDATE users
             SET active_pair_id = $2,
                 personal_pair_id = COALESCE(personal_pair_id, $2)
             WHERE id = $1`,
            [userId, pairId]
          );
        }

        if (requestedPairName) {
          await client.query('UPDATE pairs SET name = $2 WHERE id = $1', [pairId, requestedPairName]);
        }

        if (user.personal_pair_id === pairId) {
          await client.query(
            `UPDATE users
             SET personal_pair_id = NULL
             WHERE id = $1`,
            [userId]
          );
        }

        const pairResult = await client.query(
          'SELECT server_version, name FROM pairs WHERE id = $1',
          [pairId]
        );

        const invite = await createInvite(client, pairId!, userId);

        const updatedUserResult = await client.query(
          'SELECT active_pair_id, personal_pair_id FROM users WHERE id = $1',
          [userId]
        );

        const updatedUser = updatedUserResult.rows[0] as any;
        const accessToken = authService.issueAccessToken(userId, sessionId, updatedUser.active_pair_id);

        await client.query('COMMIT');

        return {
          pair_id: pairId,
          user_id: userId,
          invite_code: invite.inviteCode,
          invite_expires_at: invite.expiresAt.toISOString(),
          server_version: String(pairResult.rows[0].server_version),
          access_token: accessToken,
          token: accessToken,
          pair_context: authService.buildPairContext({
            active_pair_id: updatedUser.active_pair_id,
            personal_pair_id: updatedUser.personal_pair_id,
            active_pair_name: pairResult.rows[0].name,
          }),
        } as any;
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
      onRequest: [authenticateUser],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 hour',
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['invite_code', 'import_mode'],
          properties: {
            invite_code: { type: 'string', minLength: 6, maxLength: 16 },
            import_mode: { type: 'string', enum: ['replace', 'merge'] },
          },
        },
      },
    },
    async (request) => {
      const { userId, sessionId } = (request as AuthenticatedRequest).user;
      const { invite_code, import_mode } = request.body;

      if (!invite_code) {
        throw new ValidationError('invite_code is required');
      }

      const code = invite_code.toUpperCase().trim();
      const client = await db.connect();

      try {
        await client.query('BEGIN');

        const userResult = await client.query(
          `SELECT id, personal_pair_id, active_pair_id
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new NotFoundError('User not found');
        }

        const user = userResult.rows[0] as any;
        const personalPairId = user.personal_pair_id as string | null;
        const activePairId = user.active_pair_id as string | null;

        if (!personalPairId || activePairId !== personalPairId) {
          throw new ConflictError('Join is allowed only from personal context');
        }

        const inviteResult = await client.query(
          `SELECT i.pair_id, i.expires_at, i.used_at
           FROM invites i
           WHERE i.code = $1
           FOR UPDATE`,
          [code]
        );

        if (inviteResult.rows.length === 0) {
          throw new NotFoundError('Invalid invite code');
        }

        const invite = inviteResult.rows[0] as any;

        if (invite.used_at) {
          throw new ConflictError('Invite code already used');
        }

        if (new Date(invite.expires_at).getTime() < Date.now()) {
          throw new ConflictError('Invite code expired');
        }

        const targetPairId = invite.pair_id as string;

        if (targetPairId === personalPairId) {
          throw new ConflictError('Cannot join your own personal pair');
        }

        await client.query('SELECT id FROM pairs WHERE id = $1 FOR UPDATE', [targetPairId]);

        const memberCountResult = await client.query(
          'SELECT COUNT(*) as count FROM pair_members WHERE pair_id = $1',
          [targetPairId]
        );

        if (parseInt(memberCountResult.rows[0].count, 10) >= 2) {
          throw new ConflictError('Pair is full (maximum 2 members)');
        }

        if (import_mode === 'merge') {
          await copyPairSnapshot(client, personalPairId, targetPairId);
        }

        await client.query(
          'DELETE FROM pair_members WHERE pair_id = $1 AND user_id = $2',
          [personalPairId, userId]
        );

        await client.query(
          'INSERT INTO pair_members (pair_id, user_id, role) VALUES ($1, $2, $3)',
          [targetPairId, userId, 'member']
        );

        await client.query(
          'UPDATE invites SET used_by = $1, used_at = NOW() WHERE code = $2',
          [userId, code]
        );

        const oldPairCount = await client.query(
          'SELECT COUNT(*) as count FROM pair_members WHERE pair_id = $1',
          [personalPairId]
        );

        if (parseInt(oldPairCount.rows[0].count, 10) === 0) {
          await client.query('DELETE FROM pairs WHERE id = $1', [personalPairId]);
        }

        await client.query(
          `UPDATE users
           SET personal_pair_id = NULL,
               active_pair_id = $2
           WHERE id = $1`,
          [userId, targetPairId]
        );

        const pairResult = await client.query(
          'SELECT server_version, name FROM pairs WHERE id = $1',
          [targetPairId]
        );

        const syncData = await loadPairSyncData(client, targetPairId);
        const accessToken = authService.issueAccessToken(userId, sessionId, targetPairId);

        await client.query('COMMIT');

        return {
          pair_id: targetPairId,
          user_id: userId,
          server_version: String(pairResult.rows[0].server_version),
          initial_data: {
            categories: syncData.categories.map((entry) => snakeToCamel(entry)),
            items: syncData.items.map((entry) => snakeToCamel(entry)),
            history: syncData.history.map((entry) => snakeToCamel(entry)),
          },
          access_token: accessToken,
          token: accessToken,
          pair_context: authService.buildPairContext({
            active_pair_id: targetPairId,
            personal_pair_id: null,
            active_pair_name: pairResult.rows[0].name,
          }),
        } as any;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  );

  // POST /pair/leave
  server.post<{ Reply: LeavePairResponse }>(
    '/leave',
    {
      onRequest: [authenticateUser],
    },
    async (request) => {
      const { userId, sessionId } = (request as AuthenticatedRequest).user;

      const client = await db.connect();

      try {
        await client.query('BEGIN');

        const userResult = await client.query(
          `SELECT personal_pair_id, active_pair_id
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new NotFoundError('User not found');
        }

        const user = userResult.rows[0] as any;
        const activePairId = user.active_pair_id as string | null;
        const personalPairId = user.personal_pair_id as string | null;

        if (!activePairId) {
          throw new ConflictError('No active pair');
        }

        let nextPersonalPairId = activePairId;

        const isShared = !personalPairId || personalPairId !== activePairId;

        if (isShared) {
          await client.query('SELECT id FROM pairs WHERE id = $1 FOR UPDATE', [activePairId]);

          const membersResult = await client.query(
            'SELECT COUNT(*) as count FROM pair_members WHERE pair_id = $1',
            [activePairId]
          );

          const membersCount = parseInt(membersResult.rows[0].count, 10);

          if (membersCount > 1) {
            const createdPersonal = await createPersonalPair(client, userId, 'Мой холодильник');
            nextPersonalPairId = createdPersonal.pairId;

            await copyPairSnapshot(client, activePairId, nextPersonalPairId);

            await client.query(
              'DELETE FROM pair_members WHERE pair_id = $1 AND user_id = $2',
              [activePairId, userId]
            );
          } else {
            nextPersonalPairId = activePairId;
            await client.query(
              `UPDATE pair_members
               SET role = 'owner'
               WHERE pair_id = $1 AND user_id = $2`,
              [activePairId, userId]
            );
          }

          await client.query(
            `UPDATE users
             SET personal_pair_id = $2,
                 active_pair_id = $2
             WHERE id = $1`,
            [userId, nextPersonalPairId]
          );
        }

        const pairResult = await client.query(
          'SELECT server_version, name FROM pairs WHERE id = $1',
          [nextPersonalPairId]
        );

        const syncData = await loadPairSyncData(client, nextPersonalPairId);
        const accessToken = authService.issueAccessToken(userId, sessionId, nextPersonalPairId);

        await client.query('COMMIT');

        return {
          success: true,
          pair_id: nextPersonalPairId,
          server_version: String(pairResult.rows[0].server_version),
          initial_data: {
            categories: syncData.categories.map((entry) => snakeToCamel(entry)),
            items: syncData.items.map((entry) => snakeToCamel(entry)),
            history: syncData.history.map((entry) => snakeToCamel(entry)),
          },
          access_token: accessToken,
          token: accessToken,
          pair_context: authService.buildPairContext({
            active_pair_id: nextPersonalPairId,
            personal_pair_id: nextPersonalPairId,
            active_pair_name: pairResult.rows[0].name,
          }),
        } as any;
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
