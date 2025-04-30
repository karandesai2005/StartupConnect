const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');

// Load environment variables
const { env } = process;
const FFMPEG_PATH = env.FFMPEG_PATH || '/usr/local/bin/ffmpeg';
const FFPROBE_PATH = env.FFPROBE_PATH || '/usr/local/bin/ffprobe';
const UPLOAD_BASE_DIR = env.UPLOAD_BASE_DIR
  ? path.normalize(env.UPLOAD_BASE_DIR).replace(/\/+$/, '')
  : path.join(__dirname, '../Uploads');

// FFmpeg setup with verification and fallback
let ffmpegAvailable = false;
try {
  ffmpeg.setFfmpegPath(FFMPEG_PATH);
  ffmpeg.setFfprobePath(FFPROBE_PATH);
  promisify(ffmpeg.getAvailableFormats)()
    .then(() => {
      console.log('✅ FFmpeg initialized');
      ffmpegAvailable = true;
    })
    .catch(err => {
      console.error('⚠️ FFmpeg verification failed:', err.message);
      ffmpegAvailable = false;
    });
} catch (error) {
  console.error('⚠️ FFmpeg setup failed:', error.message);
  ffmpegAvailable = false;
}

// Ensure upload directories exist
const profileUploadDir = path.join(UPLOAD_BASE_DIR, 'profile_pictures');
const postUploadDir = path.join(UPLOAD_BASE_DIR, 'posts');
(async () => {
  try {
    await Promise.all([
      fs.mkdir(profileUploadDir, { recursive: true }),
      fs.mkdir(postUploadDir, { recursive: true }),
    ]);
    console.log('✅ Upload directories created');
  } catch (err) {
    console.error('❌ Directory creation failed:', err);
    process.exit(1);
  }
})();

// Filename generator
const generateFilename = (prefix, file) =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;

// Multer storage configs
const profileStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, profileUploadDir),
  filename: (_, file, cb) => cb(null, generateFilename('profile', file)),
});

const postStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, postUploadDir),
  filename: (_, file, cb) => cb(null, generateFilename('post', file)),
});

// File type filters
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const videoTypes = new Set(['video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/mkv']);

const profileFileFilter = (_, file, cb) =>
  imageTypes.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only JPEG, PNG, GIF, and WEBP allowed for profile pictures'), false);

const postFileFilter = (_, file, cb) =>
  imageTypes.has(file.mimetype) || videoTypes.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only images (JPEG, PNG, GIF, WEBP) and videos (MP4, MOV, AVI, MKV) allowed for posts'), false);

// File size limits
const limits = {
  profile: { fileSize: parseInt(env.PROFILE_SIZE_LIMIT) || 2 * 1024 * 1024 }, // 2MB default
  post: { fileSize: parseInt(env.POST_SIZE_LIMIT) || 100 * 1024 * 1024 },   // 100MB default
};

// Validate file
const validateUploadedFile = async filePath => {
  const stats = await fs.stat(filePath);
  if (stats.size === 0) throw new Error('Empty file uploaded');
  return true;
};

// Optimized video conversion
const convertToCompatibleFormat = async (filePath, originalMimetype) => {
  if (!ffmpegAvailable) {
    console.warn('⚠️ FFmpeg not available, skipping conversion');
    return filePath;
  }

  const outputPath = `${path.parse(filePath).dir}/${path.parse(filePath).name}-converted.mp4`;
  const needsReencode = originalMimetype === 'video/quicktime';

  return new Promise((resolve, reject) => {
    const command = ffmpeg(filePath)
      .outputOptions(needsReencode ? [
        '-c:v libx264', '-preset fast', '-crf 23',
        '-c:a aac', '-b:a 128k', '-movflags +faststart',
        '-pix_fmt yuv420p', '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2',
      ] : ['-c:v copy', '-c:a copy', '-movflags +faststart'])
      .toFormat('mp4')
      .save(outputPath)
      .on('end', async () => {
        await fs.unlink(filePath).catch(err => console.error('Error deleting original:', err));
        resolve(outputPath);
      })
      .on('error', reject);
  });
};

// Video metadata
const getVideoMetadata = ffmpegAvailable ? promisify(ffmpeg.ffprobe) : () => Promise.reject(new Error('FFmpeg not available'));

// Upload and convert middleware
const uploadAndConvertPostMedia = async (req, res, next) => {
  console.log('Incoming Content-Length:', req.headers['content-length']);
  
  const upload = multer({
    storage: postStorage,
    fileFilter: postFileFilter,
    limits: {
      fileSize: 100 * 1024 * 1024,
      fields: 10,
      files: 1,
      parts: 20
    }
  }).single('media');

  upload(req, res, async (err) => {
    if (err) {
      console.error('Full Multer error:', {
        code: err.code,
        message: err.message,
        stack: err.stack,
        headers: req.headers
      });
      
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
        error: err.code === 'LIMIT_FILE_SIZE' 
          ? 'File too large (max 100MB)' 
          : 'Upload failed'
      });
    }

    // Debug the actual uploaded file
    if (req.file) {
      try {
        const stats = await fs.stat(req.file.path);
        console.log('Uploaded file verified:', {
          size: stats.size,
          path: req.file.path,
          expected: req.headers['content-length']
        });
      } catch (e) {
        console.error('File verification failed:', e);
      }
    }

    next();
  });
};

// Upload profile picture middleware
const uploadProfilePicture = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter,
  limits: limits.profile,
}).single('profile_picture');

// Error handling middleware
const handleUploadError = (err, req, res, next) =>
  res.status(500).json({ error: 'File upload failed', details: err.message });

// Exports
module.exports = {
  uploadProfilePicture: async (req, res, next) => {
    try {
      await promisify(uploadProfilePicture)(req, res);
      if (req.file) {
        console.log(`Profile picture uploaded: ${req.file.path}`);
      }
      next();
    } catch (err) {
      console.error('Profile picture upload error:', err);
      res.status(err instanceof multer.MulterError ? 400 : 500).json({
        error: 'Profile picture upload failed',
        details: err.message,
      });
    }
  },
  uploadAndConvertPostMedia,
  handleUploadError,
  getVideoMetadata,
};