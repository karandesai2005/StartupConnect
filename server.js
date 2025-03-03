// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { connectDB } = require("./config/db");
const postRoutes = require("./routes/postRoutes");
const chatRoutes = require("./routes/chatRoutes");
const authController = require("./controllers/authController"); // Import authController

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
app.use("/api", chatRoutes);

// Auth routes
app.post("/api/auth/login", authController.login); // Use authController.login
app.post("/api/auth/save-user-details", authController.saveUserDetails); // Update this too if needed

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.url} not found` });
});

// Server startup
async function startServer() {
  try {
    await connectDB();
    console.log("✅ Database connection successful!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📝 Chat routes available at http://0.0.0.0:${PORT}/api/chats`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to the database:", err);
    process.exit(1);
  }
}

startServer().catch(console.error);

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});