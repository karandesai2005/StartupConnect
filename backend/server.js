const express = require("express");
const app = require("./app");
const path = require("path");
const postRoutes = require('./routes/postRoutes');

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Register routes before starting the server
app.use('/api', postRoutes);

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

// Start the server after routes are registered
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});