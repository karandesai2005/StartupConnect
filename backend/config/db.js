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

let poolPromise;

async function connectDB() {
  if (!poolPromise) {
    poolPromise = sql.connect(config)
      .then(pool => {
        console.log("✅ Connection established successfully!");
        return pool;
      })
      .catch(err => {
        console.error("❌ Database connection failed:", err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

async function queryDB(query, params = []) {
  try {
    const pool = await connectDB();
    const request = pool.request();
    params.forEach((param, index) => {
      request.input(`param${index + 1}`, param);
    });
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error("❌ Query execution failed:", error);
    throw error;
  }
}

module.exports = {
  connectDB,
  queryDB,
};
