const sql = require("mssql");

// Azure SQL Database Configuration
const config = {
  user: "pitch_admin@pitch-sql-server",
  password: "Hctip@2025",
  server: "pitch-sql-server.database.windows.net",
  database: "pitch-db",
  options: {
    encrypt: true, // Use encryption for Azure SQL
    trustServerCertificate: false, // Required for Azure
  },
};

async function connectDB() {
  try {
    await sql.connect(config);
    console.log("✅ Connected to Azure SQL Database!");
  } catch (err) {
    console.error("❌ Connection failed:", err);
  } finally {
    await sql.close();
  }
}

connectDB();
