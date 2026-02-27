import { FastifyPluginAsync } from 'fastify';
import db from '../config/database.js';
import {
  authLoginFailCounter,
  authLoginSuccessCounter,
  authRefreshFailCounter,
  authRefreshSuccessCounter,
} from '../metrics.js';
import {
  AuthResponse,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
} from '../models/types.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import {
  AuthService,
  hashPassword,
  normalizeEmail,
  validatePassword,
  verifyPassword,
} from '../services/auth.js';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors.js';

const authRoutes: FastifyPluginAsync = async (server) => {
  const authService = new AuthService(server);

  function sessionMeta(request: any) {
    const deviceIdHeader = request.headers['x-device-id'];
    const deviceId = Array.isArray(deviceIdHeader) ? deviceIdHeader[0] : deviceIdHeader;

    return {
      deviceId: typeof deviceId === 'string' ? deviceId : undefined,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    };
  }

  async function ensurePersonalPair(client: any, userId: string, defaultName: string) {
    const pairResult = await client.query(
      'INSERT INTO pairs (name, server_version) VALUES ($1, 0) RETURNING id, server_version',
      [defaultName]
    );

    const pairId = pairResult.rows[0].id as string;
    await client.query(
      'INSERT INTO pair_members (pair_id, user_id, role) VALUES ($1, $2, $3)',
      [pairId, userId, 'owner']
    );

    return {
      pairId,
      serverVersion: pairResult.rows[0].server_version,
    };
  }

  // POST /auth/register
  server.post<{ Body: RegisterRequest; Reply: AuthResponse }>('/register', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
      },
    },
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 },
          email: { type: 'string', minLength: 5, maxLength: 320 },
          password: { type: 'string', minLength: 8, maxLength: 256 },
        },
      },
    },
  }, async (request) => {
    const name = request.body.name.trim();
    const email = normalizeEmail(request.body.email);
    const password = request.body.password;

    if (!name) {
      throw new ValidationError('Name is required');
    }

    validatePassword(password);
    const passwordHash = await hashPassword(password);

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const existingResult = await client.query(
        'SELECT id FROM users WHERE lower(email) = $1 LIMIT 1',
        [email]
      );

      if (existingResult.rows.length > 0) {
        throw new ConflictError('Email is already in use');
      }

      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, is_account, last_login_at)
         VALUES ($1, $2, $3, true, NOW())
         RETURNING id, name, email`,
        [name, email, passwordHash]
      );

      const userId = userResult.rows[0].id as string;
      const personal = await ensurePersonalPair(client, userId, 'Мой холодильник');

      await client.query(
        `UPDATE users
         SET personal_pair_id = $2,
             active_pair_id = $2
         WHERE id = $1`,
        [userId, personal.pairId]
      );

      const session = await authService.issueSession(userId, personal.pairId, sessionMeta(request), client);

      const responseRow = {
        id: userId,
        name,
        email,
        personal_pair_id: personal.pairId,
        active_pair_id: personal.pairId,
        active_pair_name: 'Мой холодильник',
      };

      await client.query('COMMIT');
      authLoginSuccessCounter.inc();

      return {
        user: {
          id: responseRow.id,
          name: responseRow.name,
          email: responseRow.email,
          personal_pair_id: responseRow.personal_pair_id,
          active_pair_id: responseRow.active_pair_id,
        },
        tokens: session.tokens,
        pair_context: authService.buildPairContext(responseRow),
      };
    } catch (error: any) {
      await client.query('ROLLBACK');

      if (error?.code === '23505') {
        authLoginFailCounter.inc();
        throw new ConflictError('Email is already in use');
      }

      throw error;
    } finally {
      client.release();
    }
  });

  // POST /auth/login
  server.post<{ Body: LoginRequest; Reply: AuthResponse }>('/login', {
    config: {
      rateLimit: {
        max: 12,
        timeWindow: '15 minutes',
      },
    },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', minLength: 5, maxLength: 320 },
          password: { type: 'string', minLength: 1, maxLength: 256 },
        },
      },
    },
  }, async (request) => {
    const email = normalizeEmail(request.body.email);
    const password = request.body.password;

    const lookup = await db.query(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE lower(email) = $1
         AND is_account = true
       LIMIT 1`,
      [email]
    );

    if (lookup.rows.length === 0) {
      authLoginFailCounter.inc();
      throw new UnauthorizedError('Invalid email or password');
    }

    const foundUser = lookup.rows[0] as any;
    const validPassword = await verifyPassword(foundUser.password_hash, password);

    if (!validPassword) {
      authLoginFailCounter.inc();
      throw new UnauthorizedError('Invalid email or password');
    }

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const locked = await client.query(
        `SELECT id, name, email, personal_pair_id, active_pair_id
         FROM users
         WHERE id = $1
         FOR UPDATE`,
        [foundUser.id]
      );

      let user = locked.rows[0] as any;
      let activePairId = user.active_pair_id as string | null;
      let personalPairId = user.personal_pair_id as string | null;

      if (!activePairId) {
        const created = await ensurePersonalPair(client, user.id, 'Мой холодильник');
        activePairId = created.pairId;
        personalPairId = personalPairId || created.pairId;

        await client.query(
          `UPDATE users
           SET active_pair_id = $2,
               personal_pair_id = COALESCE(personal_pair_id, $2)
           WHERE id = $1`,
           [user.id, created.pairId]
        );
      }

      if (activePairId) {
        await client.query(
          `INSERT INTO pair_members (pair_id, user_id, role)
           VALUES ($1, $2, 'owner')
           ON CONFLICT (pair_id, user_id) DO NOTHING`,
          [activePairId, user.id]
        );
      }

      await client.query(
        `UPDATE users
         SET last_login_at = NOW()
         WHERE id = $1`,
        [user.id]
      );

      const pairResult = activePairId
        ? await client.query('SELECT name FROM pairs WHERE id = $1', [activePairId])
        : { rows: [] };

      const activePairName = pairResult.rows[0]?.name ?? null;

      const session = await authService.issueSession(user.id, activePairId, sessionMeta(request), client);

      await client.query('COMMIT');
      authLoginSuccessCounter.inc();

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          personal_pair_id: personalPairId,
          active_pair_id: activePairId,
        },
        tokens: session.tokens,
        pair_context: authService.buildPairContext({
          active_pair_id: activePairId,
          personal_pair_id: personalPairId,
          active_pair_name: activePairName,
        }),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      authLoginFailCounter.inc();
      throw error;
    } finally {
      client.release();
    }
  });

  // POST /auth/refresh
  server.post<{ Body: RefreshRequest; Reply: AuthResponse }>('/refresh', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 hour',
      },
    },
    schema: {
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string', minLength: 16, maxLength: 512 },
        },
      },
    },
  }, async (request) => {
    try {
      const refreshed = await authService.refreshSession(request.body.refresh_token);
      authRefreshSuccessCounter.inc();

      return {
        user: refreshed.user,
        tokens: refreshed.tokens,
        pair_context: refreshed.pairContext,
      };
    } catch (error) {
      authRefreshFailCounter.inc();
      throw error;
    }
  });

  // POST /auth/logout
  server.post('/logout', {
    onRequest: [authenticateUser],
  }, async (request) => {
    const { sessionId } = (request as AuthenticatedRequest).user;
    await authService.revokeSession(sessionId);
    return { success: true };
  });

  // GET /auth/me
  server.get('/me', {
    onRequest: [authenticateUser],
  }, async (request) => {
    const { userId } = (request as AuthenticatedRequest).user;

    const userResult = await db.query(
      `SELECT u.id, u.name, u.email, u.personal_pair_id, u.active_pair_id, p.name as active_pair_name
       FROM users u
       LEFT JOIN pairs p ON p.id = u.active_pair_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user = userResult.rows[0] as any;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        personal_pair_id: user.personal_pair_id,
        active_pair_id: user.active_pair_id,
      },
      pair_context: authService.buildPairContext(user),
    };
  });
};

export default authRoutes;
