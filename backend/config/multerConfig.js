const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

// 🔥 Critical Fix: Set FFmpeg path explicitly
try {
  ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
  ffmpeg.setFfprobePath('/usr/bin/ffprobe');
  
  // Verify FFmpeg installation
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      console.error('❌ FFmpeg verification failed:', err);
      process.exit(1);
    }
    console.log('✅ FFmpeg successfully initialized');
  });
} catch (error) {
  console.error('❌ FFmpeg initialization failed:', error);
  process.exit(1);
}

// Ensure upload directories exist
const profileUploadDir = path.join(__dirname, '../uploads/profile_pictures');
const postUploadDir = path.join(__dirname, '../uploads/posts');
fs.mkdirSync(profileUploadDir, { recursive: true });
fs.mkdirSync(postUploadDir, { recursive: true });

// ✅ Keep original extensions for accurate format detection
const generateFilename = (prefix, file) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  return `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`;
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
const videoTypes = ['video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/mkv'];

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
  if ([...imageTypes, ...videoTypes].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Invalid file type! Only JPEG, PNG, GIF, WEBP images and MP4, MOV, AVI, MKV videos are allowed for posts.'), false);
  }
};

// File size limits
const profileUploadLimits = { fileSize: 2 * 1024 * 1024 }; // 2MB max
const postUploadLimits = { fileSize: 100 * 1024 * 1024 }; // 100MB max

// Validate uploaded file
const validateUploadedFile = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) throw new Error('Empty file uploaded');
    if (!fs.existsSync(filePath)) throw new Error('File missing');
    return true;
  } catch (err) {
    throw new Error(`Invalid file: ${err.message}`);
  }
};

// Enhanced video conversion function with smart codec selection
const convertToCompatibleFormat = (filePath, originalMimetype) => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(
      path.dirname(filePath),
      `${path.parse(filePath).name}-converted.mp4`
    );

    // Determine if we need to re-encode or can use stream copy
    const needsReencode = originalMimetype === 'video/quicktime';
    
    const command = ffmpeg(filePath);
    
    if (needsReencode) {
      // Full re-encode for MOV/QuickTime files
      command.outputOptions([
        '-c:v libx264',         // Video codec
        '-preset fast',         // Encoding speed preset
        '-crf 23',             // Quality
        '-c:a aac',            // Audio codec
        '-b:a 128k',           // Audio bitrate
        '-movflags +faststart', // Web optimization
        '-pix_fmt yuv420p',    // Compatible pixel format
        '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2' // Ensure even dimensions
      ]);
    } else {
      // Stream copy for already compatible formats
      command.outputOptions([
        '-c:v copy',
        '-c:a copy',
        '-movflags +faststart'
      ]);
    }

    command
      .toFormat('mp4')
      .save(outputPath)
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on('end', () => {
        // Delete original file after successful conversion
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting original file:', err);
        });
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        // Don't delete original file on error
        reject(err);
      });
  });
};

// Function to get video metadata
const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
};

// Enhanced middleware to handle uploads and video conversion
const uploadAndConvertPostMedia = (req, res, next) => {
  const upload = multer({
    storage: postStorage,
    fileFilter: postFileFilter,
    limits: postUploadLimits,
  }).single('media');

  upload(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) return next();

    try {
      // Validate uploaded file
      validateUploadedFile(req.file.path);

      // Convert only non-MP4 videos
      if (req.file.mimetype !== 'video/mp4' && req.file.mimetype.startsWith('video/')) {
        console.log(`Starting conversion for: ${req.file.filename}`);
        const startTime = Date.now();

        // Convert the video
        req.file.path = await convertToCompatibleFormat(req.file.path, req.file.mimetype);
        req.file.filename = path.basename(req.file.path);
        req.file.mimetype = 'video/mp4';

        // Get and log video metadata
        const metadata = await getVideoMetadata(req.file.path);
        console.log('Converted video metadata:', {
          codec: metadata.streams[0]?.codec_name,
          duration: metadata.format?.duration,
          size: metadata.format?.size
        });

        console.log(`Conversion completed in ${(Date.now() - startTime)/1000}s`);
      }

      next();
    } catch (error) {
      console.error('Processing error:', error);
      return res.status(500).json({ 
        error: 'File processing failed', 
        details: error.message 
      });
    }
  });
};

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  console.error('Upload error:', err);
  res.status(500).json({ 
    error: 'File upload failed', 
    details: err.message 
  });
};

module.exports = {
  uploadProfilePicture: multer({
    storage: profileStorage,
    fileFilter: profileFileFilter,
    limits: profileUploadLimits
  }),
  uploadAndConvertPostMedia,
  handleUploadError,
  getVideoMetadata
};