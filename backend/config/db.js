const sql = require('mssql');
require('dotenv').config();

// Check if environment variables are loaded
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
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: false, // Change to true if you face certificate issues
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
};

// ✅ Function to establish DB connection
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

// ✅ Function to test DB connection (fixing missing reference)
async function testConnection() {
  try {
    console.log('⚡ Attempting to connect to database...');
    await sql.connect(config);
    console.log("✅ Successfully connected to Azure SQL Database!");

    // Run a test query
    const result = await sql.query('SELECT 1 AS test');
    console.log("🟢 Test Query Result:", result.recordset);

    // Close connection
    await sql.close();
    return true;
  } catch (err) {
    console.error("❌ Database Connection Failed!");
    console.error("➡️ Error:", err);
    return false;
  }
}

// ✅ Export both functions properly
module.exports = {
  connectDB,   // Corrected export
  testConnection,
  sql
};
