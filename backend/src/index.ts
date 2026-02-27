// In production, env vars are provided by Docker via env_file
// For local development, load .env file
import server from './server.js';
import db, { testConnection } from './config/database.js';
import logger from './utils/logger.js';

// Import routes
import pairRoutes from './routes/pair.js';
import syncRoutes from './routes/sync.js';
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Test database connection with retry
    await testConnection();
    logger.info('Database connected successfully');

    // Register routes
    server.register(authRoutes, { prefix: '/auth' });
    server.register(pairRoutes, { prefix: '/pair' });
    server.register(syncRoutes, { prefix: '/sync' });
    server.register(analyticsRoutes);

    // Start server
    await server.listen({ port: PORT, host: HOST });
    logger.info(`Server listening on ${HOST}:${PORT}`);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server');
  await server.close();
  await db.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server');
  await server.close();
  await db.end();
  process.exit(0);
});

start();
