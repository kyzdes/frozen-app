const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrationFile = path.join(__dirname, '001_initial.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Running migration: 001_initial.sql');
    await client.query(sql);
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
