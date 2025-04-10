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
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  ssl: { rejectUnauthorized: false }, // For development
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function connectDB() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    console.log("✅ Connected to Supabase successfully!");
    client.release();
    return pool;
  } catch (err) {
    console.error("❌ Supabase connection failed:", err);
    throw err;
  }
}

async function queryDB(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("❌ Query execution failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { connectDB, queryDB };