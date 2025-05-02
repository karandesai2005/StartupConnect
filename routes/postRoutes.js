const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authenticateJWT = require('../middleware/authenticateJWT');
const { uploadPostMedia } = require('../config/multerConfig'); // Fix the middleware import

// Debug middleware
const debugMiddleware = (req, res, next) => {
  console.log('=== Route Debug ===');
  console.log('Route:', req.originalUrl, '| Method:', req.method);
  console.log('User:', req.user);
  console.log('Query:', req.query);
  if (req.file) {
    console.log('Processed File:', req.file.filename, '| Type:', req.file.mimetype);
  } else if (req.method === 'POST') {
    console.log('No media uploaded.');
  }
  next();
};

// Post Routes
router.route('/')
  .get(authenticateJWT, debugMiddleware, postController.getAllPosts)
  .post(debugMiddleware, authenticateJWT, uploadPostMedia, postController.createPost);

router.route('/all')
  .get(debugMiddleware, postController.getAllPosts); // Public access

// Like Routes
router.route('/:postId/likes')
  .get(authenticateJWT, debugMiddleware, postController.getLikes); // Fix: getLikeStatus -> getLikes

router.route('/:postId/toggle-like')
  .post(authenticateJWT, debugMiddleware, postController.toggleLike);

// Comment Routes
router.route('/:postId/comments')
  .get(authenticateJWT, debugMiddleware, postController.getComments)
  .post(authenticateJWT, debugMiddleware, postController.addComment); // Fix: createComment -> addComment

module.exports = router;