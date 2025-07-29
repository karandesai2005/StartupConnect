const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const { supabase } = require("../services/supabase"); // Import Supabase client

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
  const fileExtension = file.originalname.split(".").pop().toLowerCase();
  const isImageByExt = ["jpg", "jpeg", "png", "gif", "heic", "heif"].includes(fileExtension);
  const isVideoByExt = ["mp4", "mov"].includes(fileExtension);

  if (isImage || isVideo || isImageByExt || isVideoByExt) {
    if (!isImage && !isVideo) {
      if (isVideoByExt) {
        file.mimetype = "video/mp4";
        file.media_type = "video";
      } else if (isImageByExt) {
        file.mimetype = fileExtension === "heic" || fileExtension === "heif" ? "image/jpeg" : `image/${fileExtension}`;
        file.media_type = "image";
      }
    } else {
      file.media_type = isVideo ? "video" : "image";
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
  post: { fileSize: 10 * 1024 * 1024 }, // 10MB for testing
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

// Utility function to clean URLs
const cleanUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/+/g, "/").replace(/^http:/, "https:");
};

// Route handlers using Supabase storage
const express = require("express");
const router = express.Router();

router.post("/upload-profile", uploadProfilePicture, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let buffer = req.file.buffer;
    let contentType = req.file.mimetype;
    let filename = `${Date.now()}-${req.file.originalname}`;

    // Convert HEIC/HEIF to JPEG
    if (req.file.mimetype === "image/heic" || req.file.mimetype === "image/heif") {
      buffer = await sharp(buffer).jpeg({ quality: 80, progressive: true }).toBuffer();
      contentType = "image/jpeg";
      filename = filename.replace(/\.(heic|heif)$/i, ".jpg");
    }

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("profiles")
      .upload(filename, buffer, { contentType });

    if (error) {
      console.error("Supabase upload error for profile picture:", error.message);
      return res.status(500).json({ error: "Failed to upload profile picture" });
    }

    const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(filename);
    const fileUrl = cleanUrl(urlData.publicUrl);

    console.log(`Profile picture uploaded: ${fileUrl}`);

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
    let filename = `${Date.now()}-${req.file.originalname}`;
    const mediaType = req.file.media_type || (contentType.startsWith("video") ? "video" : "image");

    // Convert HEIC/HEIF to JPEG
    if (req.file.mimetype === "image/heic" || req.file.mimetype === "image/heif") {
      buffer = await sharp(buffer).jpeg({ quality: 80, progressive: true }).toBuffer();
      contentType = "image/jpeg";
      filename = filename.replace(/\.(heic|heif)$/i, ".jpg");
    }

    // Validate video format for iOS (H.264)
    if (mediaType === "video") {
      // Note: Sharp cannot validate video codecs; consider using ffmpeg for validation
      // For simplicity, assume MP4/MOV are H.264; add ffmpeg check if needed
    }

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("posts")
      .upload(filename, buffer, { contentType });

    if (error) {
      console.error("Supabase upload error for post media:", error.message);
      return res.status(500).json({ error: "Failed to upload post media" });
    }

    const { data: urlData } = supabase.storage.from("posts").getPublicUrl(filename);
    const fileUrl = cleanUrl(urlData.publicUrl);

    console.log(`Post media uploaded: ${fileUrl}`);

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