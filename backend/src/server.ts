import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import logger from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { getRegistry, httpRequestDuration, httpErrorCounter } from './metrics.js';

const isProduction = process.env.NODE_ENV === 'production';
const trustProxy = process.env.TRUST_PROXY === 'true' || isProduction;

const server = Fastify({
  logger: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  trustProxy,
  bodyLimit: parseInt(process.env.BODY_LIMIT_BYTES || '1048576', 10), // 1MB default
});

// CORS — restrict to env-configured origin in production
const corsOriginEnv = process.env.CORS_ORIGIN;
const corsOrigin = corsOriginEnv
  ? (corsOriginEnv === 'true'
      ? true
      : corsOriginEnv
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean))
  : (isProduction ? false : true);

server.register(cors, {
  origin: corsOrigin,
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

// Prometheus metrics hooks
server.addHook('onRequest', async (request) => {
  (request as any)._startTime = process.hrtime.bigint();
});

server.addHook('onResponse', async (request, reply) => {
  const start = (request as any)._startTime;
  if (start) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    httpRequestDuration.observe(
      { method: request.method, route: request.routeOptions?.url || request.url, status_code: reply.statusCode },
      durationMs / 1000
    );
  }
  if (reply.statusCode >= 400) {
    httpErrorCounter.inc({ method: request.method, status_code: reply.statusCode });
  }
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
const metricsEnabled = process.env.METRICS_ENABLED !== 'false';
const metricsToken = process.env.METRICS_TOKEN;

if (metricsEnabled) {
  server.get('/metrics', async (request, reply) => {
    if (metricsToken) {
      const auth = request.headers.authorization;
      if (auth !== `Bearer ${metricsToken}`) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Metrics token required',
        });
      }
    }

    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
}

// Not found handler
server.setNotFoundHandler((_request, reply) => {
  reply.status(404).send({
    error: 'NOT_FOUND',
    message: 'Route not found',
  });
});

export default server;
