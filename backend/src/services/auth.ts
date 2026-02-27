import argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { FastifyInstance } from 'fastify';
import { PoolClient } from 'pg';
import db from '../config/database.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

const ACCESS_TOKEN_TTL = '15m';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  personal_pair_id: string | null;
  active_pair_id: string | null;
}

export interface PairContext {
  active_pair_id: string | null;
  personal_pair_id: string | null;
  mode: 'personal' | 'shared' | 'none';
  active_pair_name?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface SessionMeta {
  deviceId?: string;
  userAgent?: string;
  ip?: string;
}

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@') || normalized.length < 5) {
    throw new ValidationError('Invalid email');
  }
  return normalized;
}

export function validatePassword(password: string): void {
  if (password.trim().length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildPairContext(row: {
  active_pair_id: string | null;
  personal_pair_id: string | null;
  active_pair_name?: string | null;
}): PairContext {
  if (!row.active_pair_id) {
    return {
      active_pair_id: null,
      personal_pair_id: row.personal_pair_id,
      mode: 'none',
      active_pair_name: null,
    };
  }

  return {
    active_pair_id: row.active_pair_id,
    personal_pair_id: row.personal_pair_id,
    mode: row.personal_pair_id && row.personal_pair_id === row.active_pair_id ? 'personal' : 'shared',
    active_pair_name: row.active_pair_name ?? null,
  };
}

function normalizeIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  return ip.slice(0, 128);
}

export class AuthService {
  constructor(private readonly server: FastifyInstance) {}

  issueAccessToken(userId: string, sessionId: string, activePairId: string | null): string {
    return this.server.jwt.sign(
      {
        sub: userId,
        session_id: sessionId,
        active_pair_id: activePairId,
        type: 'access',
      },
      { expiresIn: ACCESS_TOKEN_TTL }
    );
  }

  async issueSession(
    userId: string,
    activePairId: string | null,
    meta: SessionMeta,
    clientArg?: PoolClient
  ): Promise<{ tokens: AuthTokens; sessionId: string }> {
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const client = clientArg || db;

    const sessionResult = await client.query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at, device_id, user_agent, ip)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        userId,
        refreshTokenHash,
        expiresAt,
        meta.deviceId || null,
        meta.userAgent || null,
        normalizeIp(meta.ip) || null,
      ]
    );

    const sessionId = sessionResult.rows[0].id as string;
    const accessToken = this.issueAccessToken(userId, sessionId, activePairId);

    return {
      sessionId,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
      },
    };
  }

  async refreshSession(refreshToken: string): Promise<{ tokens: AuthTokens; user: AuthUser; pairContext: PairContext }> {
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const sessionResult = await db.query(
      `SELECT s.id, s.user_id, s.expires_at, s.revoked_at,
              u.name, u.email, u.personal_pair_id, u.active_pair_id,
              p.name as active_pair_name
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN pairs p ON p.id = u.active_pair_id
       WHERE s.refresh_token_hash = $1
       LIMIT 1`,
      [refreshTokenHash]
    );

    if (sessionResult.rows.length === 0) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const session = sessionResult.rows[0] as any;

    if (session.revoked_at) {
      throw new UnauthorizedError('Refresh token revoked');
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await db.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1', [session.id]);
      throw new UnauthorizedError('Refresh token expired');
    }

    const nextRefreshToken = randomBytes(48).toString('base64url');
    const nextRefreshHash = hashRefreshToken(nextRefreshToken);
    const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await db.query(
      `UPDATE auth_sessions
       SET refresh_token_hash = $2,
           expires_at = $3
       WHERE id = $1`,
      [session.id, nextRefreshHash, nextExpiresAt]
    );

    const activePairId = session.active_pair_id as string | null;
    const accessToken = this.issueAccessToken(session.user_id, session.id, activePairId);

    const user: AuthUser = {
      id: session.user_id,
      name: session.name,
      email: session.email,
      personal_pair_id: session.personal_pair_id,
      active_pair_id: activePairId,
    };

    return {
      tokens: {
        access_token: accessToken,
        refresh_token: nextRefreshToken,
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
      },
      user,
      pairContext: buildPairContext(session),
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await db.query(
      'UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL',
      [sessionId]
    );
  }

  buildPairContext(row: {
    active_pair_id: string | null;
    personal_pair_id: string | null;
    active_pair_name?: string | null;
  }): PairContext {
    return buildPairContext(row);
  }
}
