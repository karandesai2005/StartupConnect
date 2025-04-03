// postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authenticateJWT = require('../middleware/authenticateJWT');
const { uploadAndConvertPostMedia } = require('../config/multerConfig');

// Debug middleware
const debugMiddleware = (req, res, next) => {
  console.log('=== Route Debug ===');
  console.log('Route:', req.path, '| Method:', req.method);
  console.log('User:', req.user);
  if (req.file) {
    console.log('Processed File:', req.file.filename, '| Type:', req.file.mimetype);
  } else if (req.method === 'POST') {
    console.log('No media uploaded.');
  }
  next();
};

// Post Routes
router.route('/posts')
  .get(authenticateJWT, postController.getAllPosts)
  .post(debugMiddleware, authenticateJWT, uploadAndConvertPostMedia, postController.createPost);

router.route('/posts/all')
  .get(postController.getAllPosts); // Public access

router.route('/posts/:postId')
  .delete(authenticateJWT, postController.deletePost);

// Like Routes
router.route('/posts/:postId/likes')
  .get(authenticateJWT, postController.getLikeStatus);

router.route('/posts/:postId/toggle-like')
  .post(authenticateJWT, postController.toggleLike);

// Comment Routes
router.route('/posts/:postId/comments')
  .get(authenticateJWT, postController.getComments)
  .post(authenticateJWT, postController.createComment);

// User Post Routes
router.route('/posts/myposts')
  .get(authenticateJWT, postController.getUserPosts);

router.route('/posts/user/:username')
  .get(authenticateJWT, postController.getPostsByUsername);

module.exports = router;