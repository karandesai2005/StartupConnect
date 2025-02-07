const express = require('express');
const postController = require('../controllers/postController');
const authenticateJWT = require('../middleware/authenticateJWT');
const { uploadPostImage } = require("../config/multerConfig");

const router = express.Router();

// Debug Middleware
const debugMiddleware = (req, res, next) => {
  console.log('=== Route Debug ===');
  console.log('Route:', req.path, '| Method:', req.method);
  console.log('User:', req.user);
  next();
};

// Optimized Order
router.post('/posts', 
  debugMiddleware, 
  authenticateJWT,  
  uploadPostImage.single('image'),  // Parse file before authentication
  postController.createPost
);

router.get('/posts/myposts', authenticateJWT, postController.getUserPosts);
router.get('/users/:user_id/posts', authenticateJWT, postController.getUserPosts);
router.get('/posts', authenticateJWT, postController.getAllPosts);

module.exports = router;
