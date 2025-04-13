require('dotenv').config();

const { Pool } = require('pg');

console.log("🔍 Checking Environment Variables:");
console.log("🔹 DB_USER:", process.env.DB_USER || "❌ Not Set");
console.log("🔹 DB_PASSWORD:", process.env.DB_PASSWORD ? "✔️ Set" : "❌ Not Set");
console.log("🔹 DB_HOST:", process.env.DB_HOST || "❌ Not Set");
console.log("🔹 DB_NAME:", process.env.DB_NAME || "❌ Not Set");
console.log("🔹 DB_PORT:", process.env.DB_PORT || "❌ Not Set");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10) || 5432, // Corrected to session pooler port
  ssl: {
    rejectUnauthorized: false, // Temporarily disable for testing (update with CA later)
  },
  family: 4, // Force IPv4 for Free tier compatibility
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function connectDB() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log("✅ Connected to Supabase Session Pooler:", res.rows[0].now);
    client.release();
    return pool;
  } catch (err) {
    console.error("❌ Supabase Session Pooler connection failed:", err.stack);
    throw err;
  }
}

async function queryDB(query, params = []) {
  const client = await pool.connect();
  console.log('Executing query in queryDB:', { query, params });
  if (!Array.isArray(params)) {
    console.error('❌ Parameters must be an array:', params);
    throw new Error('Invalid parameters format');
  }
  try {
    const result = await client.query(query, params);
    console.log('Query executed successfully:', result.rows);
    return result.rows;
  } catch (error) {
    console.error('❌ Query execution failed:', error.stack);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { connectDB, queryDB };

// Test connection on startup
connectDB().catch(() => process.exit(1));