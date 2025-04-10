require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg"); // Use pg for Supabase (PostgreSQL)
const postRoutes = require("./routes/postRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check route
app.get("/", (req, res) => {
  res.send("Welcome to the backend server!");
});

// API Routes
app.use("/api", postRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.url} not found` });
});

// Supabase (PostgreSQL) Configuration
const supabaseConfig = {
  user: process.env.DB_USER, // e.g., "postgres"
  password: process.env.DB_PASSWORD, // e.g., "Hctip@2025"
  host: process.env.DB_HOST, // e.g., "db.auduwokjsfgdzhu.supabase.co"
  database: process.env.DB_NAME, // e.g., "postgres"
  port: parseInt(process.env.DB_PORT, 10) || 5432, // Default PostgreSQL port
  ssl: {
    rejectUnauthorized: false, // Required for Supabase SSL
  },
  max: 10, // Max connections in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout a connection after 2 seconds
};

let supabasePool;

async function connectDB() {
  if (!supabasePool) {
    supabasePool = new Pool(supabaseConfig)
      .connect()
      .then(() => {
        console.log("✅ Supabase connection established successfully!");
        return supabasePool;
      })
      .catch(err => {
        console.error("❌ Supabase connection failed:", err);
        supabasePool = null;
        throw err;
      });
  }
  return supabasePool;
}

async function queryDB(query, params = []) {
  try {
    const pool = await connectDB();
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("❌ Supabase query execution failed:", error);
    throw error;
  }
}

// Function to send dummy request to keep database alive
async function keepDatabaseAlive() {
  try {
    const client = await connectDB();
    await client.query("SELECT 1"); // Lightweight dummy query
    console.log("✅ Sent dummy request to keep Supabase alive");
  } catch (err) {
    console.error("❌ Error sending dummy request:", err);
  }
}

// Start the database alive check every 2 minutes
setInterval(keepDatabaseAlive, 2 * 60 * 1000); // 2 minutes in milliseconds

// Server startup
async function startServer() {
  try {
    await connectDB();
    console.log("✅ Database connection successful!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to Supabase:", err);
    process.exit(1);
  }
}

startServer().catch(console.error);

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});

module.exports = {
  connectDB,
  queryDB,
};