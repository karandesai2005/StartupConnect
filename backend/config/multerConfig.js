const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const profileUploadDir = path.join(__dirname, '../uploads/profile_pictures');
const postUploadDir = path.join(__dirname, '../uploads/posts');
fs.mkdirSync(profileUploadDir, { recursive: true });
fs.mkdirSync(postUploadDir, { recursive: true });

// Multer storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Multer storage for post images
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, postUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Define file filters
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.'), false);
  }
};

// Create multer instances
const uploadProfilePicture = multer({ storage: profileStorage, fileFilter });
const uploadPostImage = multer({ storage: postStorage, fileFilter });

module.exports = { uploadProfilePicture, uploadPostImage };
