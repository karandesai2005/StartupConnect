require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { connectDB } = require("./config/db");

const postRoutes = require("./routes/postRoutes");
const authRoutes = require("./routes/authRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

// 🔥 REQUIRED for Elastic Beanstalk
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Static files
app.use("/uploads", express.static(path.join(__dirname, "Uploads")));

// Health check (VERY IMPORTANT for EB)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the PITCH-backend server!");
});

// API routes
app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/feedback", feedbackRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.url} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

// 🚀 Server startup
async function startServer() {
  try {
    // ✅ ONLY connect DB in development (NOT on EB)
    if (process.env.NODE_ENV !== "production") {
      await connectDB();
      console.log("🗄️ Local DB connected");
    } else {
      console.log("⚠️ Skipping local DB connection in production");
    }

    console.log("Environment check:", {
      NODE_ENV: process.env.NODE_ENV,
      BASE_URL: process.env.BASE_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      PORT,
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

// Safety net
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
