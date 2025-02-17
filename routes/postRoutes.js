const express = require('express');
const postController = require('../controllers/postController');
const authenticateJWT = require('../middleware/authenticateJWT');
const { uploadAndConvertPostMedia } = require("../config/multerConfig"); // Updated multer import

const router = express.Router();

// Debug Middleware
const debugMiddleware = (req, res, next) => {
  console.log('=== Route Debug ===');
  console.log('Route:', req.path, '| Method:', req.method);
  console.log('User:', req.user);
  next();
};

// Post Creation Route (Supports Image & Video, Converts MOV to MP4)
router.post('/posts',
  debugMiddleware,
  authenticateJWT, // Authenticate user first
  uploadAndConvertPostMedia, // Upload + MOV-to-MP4 conversion
  (req, res, next) => {
    if (req.file) {
      console.log('Processed File:', req.file.filename, '| Type:', req.file.mimetype);
    } else {
      console.log('No media uploaded.');
    }
    next();
  },
  postController.createPost
);
router.post('/posts/:postId/toggle-like', 
  authenticateJWT, 
  postController.toggleLike
);

router.get('/posts/:postId/likes', 
  authenticateJWT, 
  postController.getLikeStatus
);
// Fetch User's Own Posts
router.get('/posts/myposts', authenticateJWT, postController.getUserPosts);

// Fetch Posts by Specific User
router.get('/users/:user_id/posts', authenticateJWT, postController.getUserPosts);

// Fetch All Posts (Authenticated)
router.get('/posts', authenticateJWT, postController.getAllPosts);

// Fetch All Posts (Public Access)
router.get('/posts/all', postController.getAllPosts);

module.exports = router;