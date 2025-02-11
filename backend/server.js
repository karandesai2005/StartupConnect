require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const app = require("./app");
const path = require("path");
const postRoutes = require("./routes/postRoutes");
const { connectDB } = require("./config/db"); // Import Azure SQL connection

const PORT = process.env.PORT || 8080;

// ✅ Ensure DB connection before starting the server
async function startServer() {
  try {
    await connectDB(); // Ensure DB connection before starting Express server
    console.log("✅ Database connection successful!");

    // Serve static files from uploads folder
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // Register routes before starting the server
    app.use("/api", postRoutes);

    // Root route
    app.get("/", (req, res) => {
      res.send("Welcome to the backend server!");
    });

    // Login route
    app.post("/api/auth/login", (req, res) => {
      res.json({ message: "Login successful!" });
    });

    app.post("/api/auth/save-user-details", (req, res) => {
      res.json({ message: "User details saved!" });
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Failed to connect to the database. Server not started.");
    process.exit(1); // Exit process if DB connection fails
  }
}

// Start the server
startServer();
