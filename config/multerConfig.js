const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

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
  if ([...imageTypes, ...videoTypes, 'video/quicktime'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Invalid file type! Only JPEG, PNG, GIF, WEBP images and MP4, MOV, AVI, MKV videos are allowed for posts.'), false);
  }
};

// File size limits
const profileUploadLimits = { fileSize: 2 * 1024 * 1024 }; // 2MB max for profile pictures
const postUploadLimits = { fileSize: 100 * 1024 * 1024 }; // 100MB max

// Function to convert MOV to MP4
const convertMovToMp4 = (filePath, outputFilePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .output(outputFilePath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => {
        console.log('✅ MOV to MP4 conversion completed:', outputFilePath);
        resolve(outputFilePath);
      })
      .on('error', (err) => {
        console.error('❌ Error converting MOV to MP4:', err);
        reject(err);
      })
      .run();
  });
};

// Middleware to upload post media
const uploadPostMedia = multer({
  storage: postStorage,
  fileFilter: postFileFilter,
  limits: postUploadLimits
}).single('postMedia');

// Middleware to handle MOV conversion after upload
const uploadAndConvertPostMedia = (req, res, next) => {
  uploadPostMedia(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    if (req.file && path.extname(req.file.filename).toLowerCase() === '.mov') {
      const movPath = req.file.path;
      const mp4Path = movPath.replace('.mov', '.mp4');

      try {
        await convertMovToMp4(movPath, mp4Path);
        req.file.filename = path.basename(mp4Path);
        req.file.path = mp4Path;
        fs.unlinkSync(movPath); // Delete original MOV file
      } catch (error) {
        return res.status(500).json({ error: 'Error converting video format.' });
      }
    }

    next();
  });
};

// Export the updated upload functions
module.exports = { uploadProfilePicture: multer({ storage: profileStorage, fileFilter: profileFileFilter, limits: profileUploadLimits }), uploadAndConvertPostMedia };
