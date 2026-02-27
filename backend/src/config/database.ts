import { Pool } from 'pg';
import logger from '../utils/logger.js';

const dbUrl = new URL(process.env.DATABASE_URL!);

const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || '5432', 10),
  database: dbUrl.pathname.slice(1),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.warn({ err }, 'Unexpected error on idle client — pool will recover');
});

/** Test the DB connection with retries */
export async function testConnection(retries = 5, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT NOW()');
      return;
    } catch (err) {
      logger.warn({ attempt, retries, err }, 'Database connection attempt failed');
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export default pool;
