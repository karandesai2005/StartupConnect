require("dotenv").config({ path: "./.env" });  // Load backend .env
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Use single connection string
  ssl: {
    rejectUnauthorized: false,  // Required for Azure PostgreSQL
  },
});

// Test connection
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL!"))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));

module.exports = pool;
