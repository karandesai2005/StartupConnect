const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const profileUploadDir = path.join(__dirname, '../uploads/profile_pictures');
const postUploadDir = path.join(__dirname, '../uploads/posts');
fs.mkdirSync(profileUploadDir, { recursive: true });
fs.mkdirSync(postUploadDir, { recursive: true });

// Function to generate a unique filename
const generateFilename = (prefix, file) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  return `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`;
};

// Multer storage for profile pictures (Only Images)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => cb(null, generateFilename('profile', file))
});

// Multer storage for post uploads (Images & Videos)
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, postUploadDir),
  filename: (req, file, cb) => cb(null, generateFilename('post', file))
});

// Allowed file types
const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const videoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv'];

// File filter for profile pictures (Only Images)
const profileFileFilter = (req, file, cb) => {
  if (imageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Invalid file type! Only JPEG, PNG, GIF, and WEBP images are allowed for profile pictures.'), false);
  }
};

// File filter for post uploads (Images & Videos)
const postFileFilter = (req, file, cb) => {
  if ([...imageTypes, ...videoTypes].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Invalid file type! Only JPEG, PNG, GIF, WEBP images and MP4, MOV, AVI, MKV videos are allowed for posts.'), false);
  }
};

// File size limits (Increase if needed)
const profileUploadLimits = { fileSize: 2 * 1024 * 1024 }; // 2MB max for profile pictures
const postUploadLimits = { fileSize: 50 * 1024 * 1024 }; // 50MB max for post images/videos

// Create multer instances with limits
const uploadProfilePicture = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter,
  limits: profileUploadLimits
});

const uploadPostMedia = multer({
  storage: postStorage,
  fileFilter: postFileFilter,
  limits: postUploadLimits
});

module.exports = { uploadProfilePicture, uploadPostMedia };
