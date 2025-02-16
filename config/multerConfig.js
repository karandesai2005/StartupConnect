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
  let ext = path.extname(file.originalname).toLowerCase();
  
  // Force .mp4 extension for MOV files
  if (file.mimetype === 'video/quicktime') {
    ext = '.mp4';
  }

  return `${prefix}-${uniqueSuffix}${ext}`;
};

// Multer storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => cb(null, generateFilename('profile', file))
});

// Multer storage for post uploads
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, postUploadDir),
  filename: (req, file, cb) => cb(null, generateFilename('post', file))
});

// Allowed file types
const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const videoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv'];

// File filter for profile pictures
const profileFileFilter = (req, file, cb) => {
  if (imageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Invalid file type! Only JPEG, PNG, GIF, and WEBP images are allowed for profile pictures.'), false);
  }
};

// File filter for post uploads
const postFileFilter = (req, file, cb) => {
  if ([...imageTypes, ...videoTypes, 'video/quicktime'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Invalid file type! Only JPEG, PNG, GIF, WEBP images and MP4, MOV, AVI, MKV videos are allowed for posts.'), false);
  }
};

// File size limits
const profileUploadLimits = { fileSize: 2 * 1024 * 1024 }; // 2MB max
const postUploadLimits = { fileSize: 100 * 1024 * 1024 }; // 100MB max

// Function to convert MOV to MP4
const convertMovToMp4 = (filePath) => {
  return new Promise((resolve, reject) => {
    const mp4Path = path.join(path.dirname(filePath), path.parse(filePath).name + '.mp4');

    ffmpeg(filePath)
      .outputOptions(['-c:v copy', '-c:a copy']) // No re-encoding (fast conversion)
      .save(mp4Path)
      .on('end', () => {
        fs.unlinkSync(filePath); // Delete original MOV file only after successful conversion
        resolve(mp4Path);
      })
      .on('error', (err) => reject(err));
  });
};

// Middleware to handle uploads and MOV to MP4 conversion
const uploadAndConvertPostMedia = (req, res, next) => {
  const upload = multer({
    storage: postStorage,
    fileFilter: postFileFilter,
    limits: postUploadLimits,
  }).single('media');

  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    if (req.file?.mimetype === 'video/quicktime') {
      try {
        req.file.path = await convertMovToMp4(req.file.path);
        req.file.filename = path.basename(req.file.path);
        req.file.mimetype = 'video/mp4'; // Update MIME type after conversion
      } catch (error) {
        return res.status(500).json({ error: 'Video conversion failed' });
      }
    }

    next();
  });
};

// Export the upload functions
module.exports = { 
  uploadProfilePicture: multer({ 
    storage: profileStorage, 
    fileFilter: profileFileFilter, 
    limits: profileUploadLimits 
  }), 
  uploadAndConvertPostMedia 
};
