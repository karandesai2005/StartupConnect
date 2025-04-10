const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.audurwojdksjrfcjdzuh', // Use the full user from the pooler config
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  database: 'postgres',
  password: process.env.DB_PASSWORD, // Set this in Azure env vars
  port: 6543,
  ssl: {
    rejectUnauthorized: true, // Supabase requires SSL
  },
  family: 4, // Force IPv4 to match pooler and Free tier compatibility
  connectionTimeoutMillis: 10000, // Increased timeout for reliability
  max: 10,
  idleTimeoutMillis: 30000,
});

async function connectDB() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Connected to Supabase Pooler:', res.rows[0].now);
    client.release();
    return pool;
  } catch (err) {
    console.error('❌ Supabase Pooler connection failed:', err.stack);
    throw err;
  }
}

async function queryDB(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('❌ Query execution failed:', error.stack);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { connectDB, queryDB };

// Test the connection on startup
connectDB().catch(() => process.exit(1));