const express = require('express');
const postController = require('../controllers/postController');
const authenticateJWT = require('../middleware/authenticateJWT');

const router = express.Router();

router.post('/posts', authenticateJWT, postController.createPost);
router.get('/posts', postController.getAllPosts);
router.get('/users/:user_id/posts', postController.getUserPosts);

module.exports = router;
