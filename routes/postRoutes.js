const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authenticateJWT = require('../middleware/authenticateJWT');
const { uploadPostMedia } = require('../config/multerConfig');
const multer = require('multer');

// Debug middleware
const debugMiddleware = (req, res, next) => {
  console.log('=== Route Debug ===');
  console.log('Route:', req.originalUrl, '| Method:', req.method);
  console.log('User:', req.user);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  if (req.file) {
    console.log('Processed File:', req.file.originalname, '| Type:', req.file.mimetype, '| Size:', req.file.size);
  } else if (req.method === 'POST') {
    console.log('No media uploaded or file not processed correctly.');
  }
  next();
};

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err.message, '| Code:', err.code, '| Field:', err.field);
    return res.status(400).json({ error: err.message, message: 'Failed to process form data' });
  } else if (err) {
    console.error('Other Error in Multer Middleware:', err.message);
    return res.status(400).json({ error: err.message, message: 'Failed to process upload' });
  }
  next();
};

// Post Routes
router.route('/')
  .get(authenticateJWT, debugMiddleware, postController.getAllPosts)
  .post(
    authenticateJWT,
    debugMiddleware,
    uploadPostMedia,
    handleMulterError,
    postController.createPost
  );

router.route('/all')
  .get(debugMiddleware, postController.getAllPosts);

// Route to fetch user's own posts
router.route('/myposts')
  .get(authenticateJWT, debugMiddleware, postController.getMyPosts);

// // Delete post route
// router.route('/:postId')
//   .delete(authenticateJWT, debugMiddleware, postController.deletePost);

// Like Routes
router.route('/:postId/likes')
  .get(authenticateJWT, debugMiddleware, postController.getLikes);

router.route('/:postId/toggle-like')
  .post(authenticateJWT, debugMiddleware, postController.toggleLike);

// Comment Routes
router.route('/:postId/comments')
  .get(authenticateJWT, debugMiddleware, postController.getComments)
  .post(authenticateJWT, debugMiddleware, postController.addComment);

module.exports = router;  