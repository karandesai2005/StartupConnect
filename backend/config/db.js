// config/db.js
require('dotenv').config();
const sql = require('mssql');
console.log("DB Config:");
console.log("User:", process.env.DB_USER);
console.log("Password:", process.env.DB_PASSWORD ? "******" : "Not Set");
console.log("Server:", process.env.DB_SERVER);
console.log("Database:", process.env.DB_NAME);

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectionTimeout: 30000, // Increased timeout
    requestTimeout: 30000,
    debug: {
      packet: true,
      data: true,
      payload: true,
      token: false,
      log: true
    }
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function testConnection() {
  try {
    // First, log the connection attempt
    console.log('Attempting to connect to database...');
    console.log('Server:', process.env.DB_SERVER);
    console.log('Database:', process.env.DB_NAME);
    console.log('Username:', process.env.DB_USER);
    
    // Test connection
    const pool = new sql.ConnectionPool(config);
    
    // Add error handler before connecting
    pool.on('error', err => {
      console.error('SQL Pool Error:', err);
    });

    await pool.connect();
    console.log("✅ Connected to Azure SQL Database!");
    
    // Test a simple query
    const result = await pool.request().query('SELECT 1 as test');
    console.log("Test query result:", result);
    
    await pool.close();
    return true;
  } catch (err) {
    console.error("Detailed connection error:");
    console.error("Error name:", err.name);
    console.error("Error code:", err.code);
    console.error("Error number:", err.number);
    console.error("Error state:", err.state);
    console.error("Error class:", err.class);
    console.error("Full error:", err);
    return false;
  }
}

async function connectDB() {
  try {
    const pool = await new sql.ConnectionPool(config).connect();
    console.log("✅ Connected to Azure SQL Database!");
    return pool;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    throw err;
  }
}

module.exports = {
  connectDB,
  testConnection,
  sql
};