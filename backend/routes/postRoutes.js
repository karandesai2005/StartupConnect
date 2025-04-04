  const express = require('express');
  const postController = require('../controllers/postController');
  const authenticateJWT = require('../middleware/authenticateJWT');
  const { uploadAndConvertPostMedia } = require("../config/multerConfig");

  const router = express.Router();


  const debugMiddleware = (req, res, next) => {
    console.log('=== Route Debug ===');
    console.log('Route:', req.path, '| Method:', req.method);
    console.log('User:', req.user);
    next();
  };

  router.post('/posts',
    debugMiddleware,
    authenticateJWT,
    uploadAndConvertPostMedia,
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

  // Toggle Like on a Post
  router.post('/posts/:postId/toggle-like', 
    authenticateJWT, 
    postController.toggleLike
  );

  // Get Like Status for a Post
  router.get('/posts/:postId/likes', 
    authenticateJWT, 
    postController.getLikeStatus
  );

  // Fetch User's Own Posts
  router.get('/posts/myposts', 
    authenticateJWT, 
    postController.getUserPosts
  );

  // Fetch Posts by Specific User (Updated to use username)
  router.get('/posts/user/:username', 
    authenticateJWT, 
    postController.getPostsByUsername
  );

  // Fetch All Posts (Authenticated)
  router.get('/posts', 
    authenticateJWT, 
    postController.getAllPosts
  );

  // Fetch All Posts (Public Access)
  router.get('/posts/all', 
    postController.getAllPosts
  );

  router.get('/posts/:postId/comments', 
    authenticateJWT, 
    postController.getComments
  );

  // Create a new comment for a specific post
  router.post('/posts/:postId/comments', 
    authenticateJWT, 
    postController.createComment
  );

  module.exports = router;