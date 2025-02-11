require('dotenv').config();  // Load .env file

// For Azure SQL Database, it's better to use the mssql package instead of pg.
// (Azure SQL is a Microsoft SQL Server, not a PostgreSQL database.)
// Ensure you have installed mssql with: npm install mssql

const sql = require('mssql');

// Log environment variables for debugging
console.log("🔍 Checking Environment Variables:");
console.log("🔹 DB_USER:", process.env.DB_USER || "❌ Not Set");
console.log("🔹 DB_PASSWORD:", process.env.DB_PASSWORD ? "✔️ Set" : "❌ Not Set");
console.log("🔹 DB_HOST:", process.env.DB_HOST || "❌ Not Set");
console.log("🔹 DB_NAME:", process.env.DB_NAME || "❌ Not Set");
console.log("🔹 DB_PORT:", process.env.DB_PORT || "❌ Not Set");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: true,               // Required for Azure SQL
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
};

async function connectDB() {
  try {
    console.log("⚡ Connecting to Azure SQL Database...");
    const pool = await sql.connect(config);
    console.log("✅ Connection established successfully!");
    return pool;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    throw err;
  }
}

module.exports = {
  connectDB,
};
