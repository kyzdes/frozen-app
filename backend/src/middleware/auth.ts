import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';

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

    (request as AuthenticatedRequest).user = payload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
