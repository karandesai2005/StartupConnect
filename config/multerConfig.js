const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const memoryStorage = multer.memoryStorage();

const imageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/heic", "image/heif"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/mov"]);

const profileFileFilter = (req, file, cb) => {
  if (imageTypes.has(file.mimetype)) {
    return cb(null, true);
  } else {
    return cb(new Error("Only JPEG, PNG, GIF, HEIC, or HEIF allowed for profile pictures"), false);
  }
};

const postFileFilter = (req, file, cb) => {
  const isImage = imageTypes.has(file.mimetype);
  const isVideo = videoTypes.has(file.mimetype);

  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  const isImageByExt = ['jpg', 'jpeg', 'png', 'gif', 'heic', 'heif'].includes(fileExtension);
  const isVideoByExt = ['mp4', 'mov', 'quicktime'].includes(fileExtension);

  if (isImage || isVideo || isImageByExt || isVideoByExt) {
    if (!isImage && !isVideo) {
      if (isVideoByExt) {
        file.mimetype = 'video/mp4';
        file.media_type = 'video';
      } else if (isImageByExt) {
        // Convert HEIC/HEIF to JPEG, so set MIME type accordingly
        file.mimetype = fileExtension === 'heic' || fileExtension === 'heif' ? 'image/jpeg' : `image/${fileExtension}`;
        file.media_type = 'image';
      }
    } else {
      file.media_type = isVideo ? 'video' : 'image';
    }
    return cb(null, true);
  } else {
    return cb(
      new Error("Only images (JPEG, PNG, GIF, HEIC, HEIF) and videos (MP4, MOV) allowed for posts"),
      false
    );
  }
};

const limits = {
  profile: { fileSize: 5 * 1024 * 1024 }, // 5MB
  post: { fileSize: 100 * 1024 * 1024 }, // 100MB
};

const uploadProfilePicture = multer({
  storage: memoryStorage,
  fileFilter: profileFileFilter,
  limits: limits.profile,
}).single("profile_picture");

const uploadPostMedia = multer({
  storage: memoryStorage,
  fileFilter: postFileFilter,
  limits: limits.post,
}).single("media");

// Example route handlers to process uploads with image conversion
const express = require("express");
const router = express.Router();

// Replace with your actual NGROK_URL or server URL
const NGROK_URL = process.env.NGROK_URL || "http://localhost:3000";

router.post("/upload-profile", uploadProfilePicture, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let buffer = req.file.buffer;
    let contentType = req.file.mimetype;
    let filename = req.file.originalname;

    // Convert HEIC/HEIF to JPEG
    if (req.file.mimetype === "image/heic" || req.file.mimetype === "image/heif") {
      buffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
      contentType = "image/jpeg";
      filename = filename.replace(/\.(heic|heif)$/i, ".jpg");
    }

    // Save file to disk (example); replace with your storage logic (e.g., S3)
    const filePath = path.join(uploadDir, `${Date.now()}-${filename}`);
    fs.writeFileSync(filePath, buffer);

    // Generate URL for the file
    const fileUrl = `${NGROK_URL}/uploads/${path.basename(filePath)}`;

    res.status(200).json({
      url: fileUrl,
      media_type: "image",
      mimetype: contentType,
    });
  } catch (err) {
    console.error("Error processing profile picture:", err);
    res.status(500).json({ error: "Failed to process image" });
  }
});

router.post("/upload-post", uploadPostMedia, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let buffer = req.file.buffer;
    let contentType = req.file.mimetype;
    let filename = req.file.originalname;
    const mediaType = req.file.media_type || (contentType.startsWith("video") ? "video" : "image");

    // Convert HEIC/HEIF to JPEG
    if (req.file.mimetype === "image/heic" || req.file.mimetype === "image/heif") {
      buffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
      contentType = "image/jpeg";
      filename = filename.replace(/\.(heic|heif)$/i, ".jpg");
    }

    // Save file to disk (example); replace with your storage logic (e.g., S3)
    const filePath = path.join(uploadDir, `${Date.now()}-${filename}`);
    fs.writeFileSync(filePath, buffer);

    // Generate URL for the file
    const fileUrl = `${NGROK_URL}/uploads/${path.basename(filePath)}`;

    res.status(200).json({
      url: fileUrl,
      media_type: mediaType,
      mimetype: contentType,
    });
  } catch (err) {
    console.error("Error processing post media:", err);
    res.status(500).json({ error: "Failed to process media" });
  }
});

module.exports = {
  uploadProfilePicture,
  uploadPostMedia,
  router,
};