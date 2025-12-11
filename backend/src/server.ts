import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import logger from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { getRegistry } from './metrics.js';

const server = Fastify({
  logger: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
});

// CORS
server.register(cors, {
  origin: true, // Allow all origins for now, restrict in production
  credentials: true,
});

// JWT
server.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: {
    expiresIn: '30d',
  },
});

// Rate limiting
server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Error handler
server.setErrorHandler((error, _request, reply) => {
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: error.code || 'ERROR',
      message: error.message,
    });
  } else if (error.statusCode === 429) {
    reply.status(429).send({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
    });
  } else {
    logger.error(error);
    reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Health check
server.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
});

// Metrics for Prometheus
const registry = getRegistry();
server.get('/metrics', async (_request, reply) => {
  reply.header('Content-Type', registry.contentType);
  return registry.metrics();
});

// Not found handler
server.setNotFoundHandler((_request, reply) => {
  reply.status(404).send({
    error: 'NOT_FOUND',
    message: 'Route not found',
  });
});

export default server;
