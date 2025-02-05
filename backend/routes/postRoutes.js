const express = require('express');
const postController = require('../controllers/postController');
const authenticateJWT = require('../middleware/authenticateJWT');
const { uploadPostImage } = require("../config/multerConfig");

const router = express.Router();

router.post('/posts', authenticateJWT, uploadPostImage.single('image'), postController.createPost);
router.get('/posts', authenticateJWT, postController.getAllPosts); // Add authentication here
router.get('/users/:user_id/posts', authenticateJWT, postController.getUserPosts);

module.exports = router;