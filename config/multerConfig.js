const multer = require("multer");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { promisify } = require("util");

// Load environment variables
const { env } = process;
const FFMPEG_PATH = env.FFMPEG_PATH || "/usr/local/bin/ffmpeg";
const FFPROBE_PATH = env.FFPROBE_PATH || "/usr/local/bin/ffprobe";

// FFmpeg setup with verification and fallback
let ffmpegAvailable = false;
try {
  ffmpeg.setFfmpegPath(FFMPEG_PATH);
  ffmpeg.setFfprobePath(FFPROBE_PATH);
  promisify(ffmpeg.getAvailableFormats)()
    .then(() => {
      console.log("✅ FFmpeg initialized");
      ffmpegAvailable = true;
    })
    .catch((err) => {
      console.error("⚠️ FFmpeg verification failed:", err.message);
      ffmpegAvailable = false;
    });
} catch (error) {
  console.error("⚠️ FFmpeg setup failed:", error.message);
  ffmpegAvailable = false;
}

// Filename generator
const generateFilename = (prefix, file) =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;

// Multer storage configs (use memoryStorage for Supabase uploads)
const profileStorage = multer.memoryStorage();
const postStorage = multer.memoryStorage();

// File type filters
const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const videoTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "video/mov",
  "video/avi",
  "video/mkv",
]);

const profileFileFilter = (_, file, cb) =>
  imageTypes.has(file.mimetype)
    ? cb(null, true)
    : cb(
        new Error("Only JPEG, PNG, GIF, and WEBP allowed for profile pictures"),
        false
      );

const postFileFilter = (_, file, cb) =>
  imageTypes.has(file.mimetype) || videoTypes.has(file.mimetype)
    ? cb(null, true)
    : cb(
        new Error(
          "Only images (JPEG, PNG, GIF, WEBP) and videos (MP4, MOV, AVI, MKV) allowed for posts"
        ),
        false
      );

// File size limits
const limits = {
  profile: { fileSize: parseInt(env.PROFILE_SIZE_LIMIT) || 2 * 1024 * 1024 }, // 2MB default
  post: { fileSize: parseInt(env.POST_SIZE_LIMIT) || 100 * 1024 * 1024 }, // 100MB default
};

// Validate file buffer
const validateFileBuffer = (file) => {
  if (!file.buffer || file.buffer.length === 0) {
    throw new Error("Empty file uploaded");
  }
  return true;
};

// Upload profile picture middleware
const uploadProfilePicture = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter,
  limits: limits.profile,
}).single("profile_picture");

// Upload post media middleware
const uploadPostMedia = multer({
  storage: postStorage,
  fileFilter: postFileFilter,
  limits: limits.post,
}).single("media");

// Video metadata
const getVideoMetadata = ffmpegAvailable
  ? promisify(ffmpeg.ffprobe)
  : () => Promise.reject(new Error("FFmpeg not available"));

// Exports
module.exports = {
  uploadProfilePicture: async (req, res, next) => {
    try {
      await promisify(uploadProfilePicture)(req, res);
      if (req.file) {
        validateFileBuffer(req.file);
        console.log(`Profile picture buffer received: ${req.file.originalname}, size: ${req.file.size} bytes`);
      }
      next();
    } catch (err) {
      console.error("Profile picture upload error:", err);
      res.status(err instanceof multer.MulterError ? 400 : 500).json({
        error: "Profile picture upload failed",
        details: err.message,
      });
    }
  },
  uploadPostMedia: async (req, res, next) => {
    try {
      await promisify(uploadPostMedia)(req, res);
      if (req.file) {
        validateFileBuffer(req.file);
        console.log(`Post media buffer received: ${req.file.originalname}, size: ${req.file.size} bytes`);
      }
      next();
    } catch (err) {
      console.error("Post media upload error:", err);
      res.status(err instanceof multer.MulterError ? 400 : 500).json({
        error: "Post media upload failed",
        details: err.message,
      });
    }
  },
  getVideoMetadata,
};