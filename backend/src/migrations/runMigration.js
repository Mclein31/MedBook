/**
 * Simple one-shot migration runner.
 * Usage: npm run migrate
 * Reads schema.sql and executes it against DATABASE_URL.
 */
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migration against database...');
  try {
    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
