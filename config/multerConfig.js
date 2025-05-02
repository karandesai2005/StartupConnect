const multer = require("multer");

// Multer storage configs (use memoryStorage for Supabase uploads)
const memoryStorage = multer.memoryStorage();

// File type filters
const imageTypes = new Set(["image/jpeg", "image/png", "image/gif"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/mov"]);

const profileFileFilter = (req, file, cb) => {
  if (imageTypes.has(file.mimetype)) {
    return cb(null, true);
  } else {
    return cb(new Error("Only JPEG, PNG, or GIF allowed for profile pictures"), false);
  }
};

const postFileFilter = (req, file, cb) => {
  // For iOS recordings sometimes the mimetype might be different
  const isImage = imageTypes.has(file.mimetype);
  const isVideo = videoTypes.has(file.mimetype);
  
  // Alternative check for file extensions if mimetype is ambiguous
  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  const isVideoByExt = ['mp4', 'mov', 'quicktime'].includes(fileExtension);
  const isImageByExt = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);
  
  if (isImage || isVideo || isImageByExt || isVideoByExt) {
    // Force the correct mimetype based on extension if needed
    if (!isImage && !isVideo) {
      if (isVideoByExt) {
        file.mimetype = 'video/mp4'; // Default to MP4 for video extensions
      } else if (isImageByExt) {
        file.mimetype = 'image/jpeg'; // Default to JPEG for image extensions
      }
    }
    return cb(null, true);
  } else {
    return cb(
      new Error("Only images (JPEG, PNG, GIF) and videos (MP4, MOV) allowed for posts"),
      false
    );
  }
};

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