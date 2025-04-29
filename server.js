require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { connectDB } = require("./config/db");
const postRoutes = require("./routes/postRoutes");
const authRoutes = require("./routes/authRoutes");
const feedbackRoutes = require('./routes/');
const profileRoutes = require("./routes/profileRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Static files
app.use("/uploads", express.static(path.join(__dirname, "Uploads")));

// Health check route
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to the PITCH-backend server!");
});

// API Routes
app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use('/api/feedback', feedbackRoutes);

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
    console.log('Environment:', {
      BASE_URL: process.env.BASE_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      PORT,
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.stack);
    process.exit(1);
  }
}

startServer().catch(console.error);

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err.stack);
  process.exit(1);
});