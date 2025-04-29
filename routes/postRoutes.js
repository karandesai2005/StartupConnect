const express = require('express');
  const router = express.Router();
  const postController = require('../controllers/postController');
  const authenticateJWT = require('../middleware/authenticateJWT');
  const { uploadAndConvertPostMedia } = require('../config/multerConfig');

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
    .post(debugMiddleware, authenticateJWT, uploadAndConvertPostMedia, postController.createPost);

  router.route('/all')
    .get(debugMiddleware, postController.getAllPosts); // Public access

  router.route('/:postId')
    .delete(authenticateJWT, debugMiddleware, postController.deletePost);

  // Like Routes
  router.route('/:postId/likes')
    .get(authenticateJWT, debugMiddleware, postController.getLikeStatus);

  router.route('/:postId/toggle-like')
    .post(authenticateJWT, debugMiddleware, postController.toggleLike);

  // Comment Routes
  router.route('/:postId/comments')
    .get(authenticateJWT, debugMiddleware, postController.getComments)
    .post(authenticateJWT, debugMiddleware, postController.createComment);

  // User Post Routes
  router.route('/myposts')
    .get(authenticateJWT, debugMiddleware, postController.getUserPosts);

  router.route('/user/:username')
    .get(authenticateJWT, debugMiddleware, postController.getPostsByUsername);

  module.exports = router;