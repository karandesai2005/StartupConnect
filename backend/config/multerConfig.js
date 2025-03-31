const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

// 🔥 Critical Fix: Set FFmpeg path explicitly
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg"); // Adjust for Azure if needed

// Ensure upload directories exist
const profileUploadDir = path.join(__dirname, "../uploads/profile_pictures");
const postUploadDir = path.join(__dirname, "../uploads/posts");
const reelUploadDir = path.join(__dirname, "../uploads/reels"); // Add reel dir
fs.mkdirSync(profileUploadDir, { recursive: true });
fs.mkdirSync(postUploadDir, { recursive: true });
fs.mkdirSync(reelUploadDir, { recursive: true }); // Create reels folder

// ✅ Keep original extensions for accurate format detection
const generateFilename = (prefix, file) => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  return `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`;
};

// Multer storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => cb(null, generateFilename("profile", file)),
});

// Multer storage for post uploads
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, postUploadDir),
  filename: (req, file, cb) => cb(null, generateFilename("post", file)),
});

// Multer storage for reels
const reelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, reelUploadDir),
  filename: (req, file, cb) => cb(null, generateFilename("reel", file)),
});

// Allowed file types
const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const videoTypes = ["video/mp4", "video/quicktime", "video/mov", "video/avi", "video/mkv"];

// File filters
const profileFileFilter = (req, file, cb) => {
  if (imageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "❌ Invalid file type! Only JPEG, PNG, GIF, and WEBP images are allowed for profile pictures."
      ),
      false
    );
  }
};

const postFileFilter = (req, file, cb) => {
  if ([...imageTypes, ...videoTypes].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "❌ Invalid file type! Only JPEG, PNG, GIF, WEBP images and MP4, MOV, AVI, MKV videos are allowed for posts."
      ),
      false
    );
  }
};

const reelFileFilter = (req, file, cb) => {
  if (videoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("❌ Invalid file type! Only videos (MP4, MOV, AVI, MKV) are allowed for reels."), false);
  }
};

// File size limits
const profileUploadLimits = { fileSize: 2 * 1024 * 1024 }; // 2MB max
const postUploadLimits = { fileSize: 100 * 1024 * 1024 }; // 100MB max
const reelUploadLimits = { fileSize: 30 * 1024 * 1024 }; // 30MB max for reels

// Validate uploaded file
const validateUploadedFile = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) throw new Error("Empty file uploaded");
    if (!fs.existsSync(filePath)) throw new Error("File missing");
    return true;
  } catch (err) {
    throw new Error(`Invalid file: ${err.message}`);
  }
};

// Enhanced video conversion function (unchanged)
const convertToCompatibleFormat = (filePath, originalMimetype) => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(
      path.dirname(filePath),
      `${path.parse(filePath).name}-converted.mp4`
    );

    const needsReencode = originalMimetype === "video/quicktime";
    const command = ffmpeg(filePath);

    if (needsReencode) {
      command.outputOptions([
        "-c:v libx264",
        "-preset fast",
        "-crf 23",
        "-c:a aac",
        "-b:a 128k",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2",
      ]);
    } else {
      command.outputOptions(["-c:v copy", "-c:a copy", "-movflags +faststart"]);
    }

    command
      .toFormat("mp4")
      .save(outputPath)
      .on("progress", (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on("end", () => {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting original file:", err);
        });
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        reject(err);
      });
  });
};

// Get video metadata (unchanged)
const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
};

// Middleware for post uploads (unchanged)
const uploadAndConvertPostMedia = (req, res, next) => {
  const upload = multer({
    storage: postStorage,
    fileFilter: postFileFilter,
    limits: postUploadLimits,
  }).single("media");

  upload(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return next();
    try {
      validateUploadedFile(req.file.path);
      if (req.file.mimetype !== "video/mp4" && req.file.mimetype.startsWith("video/")) {
        console.log(`Starting conversion for: ${req.file.filename}`);
        const startTime = Date.now();
        req.file.path = await convertToCompatibleFormat(req.file.path, req.file.mimetype);
        req.file.filename = path.basename(req.file.path);
        req.file.mimetype = "video/mp4";
        const metadata = await getVideoMetadata(req.file.path);
        console.log("Converted video metadata:", {
          codec: metadata.streams[0]?.codec_name,
          duration: metadata.format?.duration,
          size: metadata.format?.size,
        });
        console.log(`Conversion completed in ${(Date.now() - startTime) / 1000}s`);
      }
      next();
    } catch (error) {
      console.error("Processing error:", error);
      return res.status(500).json({ error: "File processing failed", details: error.message });
    }
  });
};

// New middleware for reel uploads
const uploadAndConvertReelMedia = (req, res, next) => {
  const upload = multer({
    storage: reelStorage,
    fileFilter: reelFileFilter,
    limits: reelUploadLimits,
  }).single("reel");

  upload(req, res, async (err) => {
    if (err) {
      console.error("Reel upload error:", err);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return next();
    try {
      validateUploadedFile(req.file.path);
      if (req.file.mimetype !== "video/mp4" && req.file.mimetype.startsWith("video/")) {
        console.log(`Starting reel conversion for: ${req.file.filename}`);
        const startTime = Date.now();
        req.file.path = await convertToCompatibleFormat(req.file.path, req.file.mimetype);
        req.file.filename = path.basename(req.file.path);
        req.file.mimetype = "video/mp4";
        const metadata = await getVideoMetadata(req.file.path);
        console.log("Converted reel metadata:", {
          codec: metadata.streams[0]?.codec_name,
          duration: metadata.format?.duration,
          size: metadata.format?.size,
        });
        console.log(`Reel conversion completed in ${(Date.now() - startTime) / 1000}s`);
      }
      next();
    } catch (error) {
      console.error("Reel processing error:", error);
      return res.status(500).json({ error: "Reel processing failed", details: error.message });
    }
  });
};

// Error handling middleware (unchanged)
const handleUploadError = (err, req, res, next) => {
  console.error("Upload error:", err);
  res.status(500).json({ error: "File upload failed", details: err.message });
};

module.exports = {
  uploadProfilePicture: multer({
    storage: profileStorage,
    fileFilter: profileFileFilter,
    limits: profileUploadLimits,
  }),
  uploadAndConvertPostMedia,
  uploadAndConvertReelMedia, // New export for reels
  handleUploadError,
  getVideoMetadata,
};