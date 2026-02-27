import { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';
import db from '../config/database.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    sessionId: string;
    activePairId: string | null;
  };
}

interface AccessPayload {
  sub: string;
  session_id: string;
  active_pair_id: string | null;
  type: 'access';
}

export async function authenticateUser(request: FastifyRequest) {
  try {
    const payload = await request.jwtVerify<AccessPayload>();

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    const sessionResult = await db.query(
      `SELECT s.id,
              u.id as user_id,
              u.active_pair_id,
              CASE
                WHEN u.active_pair_id IS NULL THEN true
                ELSE EXISTS (
                  SELECT 1
                  FROM pair_members pm
                  WHERE pm.user_id = u.id
                    AND pm.pair_id = u.active_pair_id
                )
              END AS has_membership
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1
         AND s.user_id = $2
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()`,
      [payload.session_id, payload.sub]
    );

    if (sessionResult.rows.length === 0) {
      throw new UnauthorizedError('Session expired or revoked');
    }

    const session = sessionResult.rows[0] as any;
    if (!session.has_membership) {
      throw new UnauthorizedError('User is no longer a member of active pair');
    }

    // If active_pair_id changed after token issuance, force re-auth via refresh/login.
    if ((session.active_pair_id || null) !== (payload.active_pair_id || null)) {
      throw new UnauthorizedError('Access token is outdated');
    }

    (request as AuthenticatedRequest).user = {
      userId: session.user_id,
      sessionId: payload.session_id,
      activePairId: session.active_pair_id,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function authenticateWithActivePair(request: FastifyRequest) {
  await authenticateUser(request);

  const activePairId = (request as AuthenticatedRequest).user.activePairId;
  if (!activePairId) {
    throw new UnauthorizedError('No active pair selected');
  }
}
