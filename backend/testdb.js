require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function testDB() {
    try {
        console.log("⏳ Connecting to Azure SQL...");
        let pool = await sql.connect(config);
        console.log("✅ Connected to Azure SQL!");

        let result = await pool.request().query('SELECT 1 AS test');
        console.log("Test query result:", result);

        await pool.close();
    } catch (err) {
        console.error("❌ Connection failed:");
        console.error("Error Message:", err.message);
        console.error("Error Code:", err.code);
        console.error("Stack:", err.stack);
    }
}

testDB();
