import { Pool } from 'pg';

console.log('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL);

// Parse DATABASE_URL manually for better control
const dbUrl = new URL(process.env.DATABASE_URL!);

console.log('[DEBUG] Parsed DB config:', {
  host: dbUrl.hostname,
  port: dbUrl.port,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password
});

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
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
