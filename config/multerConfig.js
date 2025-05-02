const multer = require("multer");

// Multer storage configs (use memoryStorage for Supabase uploads)
const memoryStorage = multer.memoryStorage();

// File type filters
const imageTypes = new Set(["image/jpeg", "image/png", "image/gif"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/mov"]);

const profileFileFilter = (_, file, cb) =>
  imageTypes.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only JPEG, PNG, or GIF allowed for profile pictures"), false);

const postFileFilter = (_, file, cb) =>
  imageTypes.has(file.mimetype) || videoTypes.has(file.mimetype)
    ? cb(null, true)
    : cb(
        new Error("Only images (JPEG, PNG, GIF) and videos (MP4, MOV) allowed for posts"),
        false
      );

// File size limits
const limits = {
  profile: { fileSize: 5 * 1024 * 1024 }, // 5MB for profile pictures
  post: { fileSize: 100 * 1024 * 1024 }, // 100MB for posts and stories
};

// Upload profile picture middleware
const uploadProfilePicture = multer({
  storage: memoryStorage,
  fileFilter: profileFileFilter,
  limits: limits.profile,
}).single("profile_picture");

// Upload post media middleware (used for posts and stories)
const uploadPostMedia = multer({
  storage: memoryStorage,
  fileFilter: postFileFilter,
  limits: limits.post,
}).single("media");

// Exports
module.exports = {
  uploadProfilePicture,
  uploadPostMedia,
};