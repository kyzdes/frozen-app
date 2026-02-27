import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';
import db from '../config/database.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    pairId: string;
    deviceId: string;
  };
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const payload = await request.jwtVerify<{
      userId: string;
      pairId: string;
      deviceId: string;
    }>();

    // Verify the user is still a member of the pair
    const memberCheck = await db.query(
      'SELECT 1 FROM pair_members WHERE pair_id = $1 AND user_id = $2',
      [payload.pairId, payload.userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new UnauthorizedError('User is no longer a member of this pair');
    }

    (request as AuthenticatedRequest).user = payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired token');
  }
}
