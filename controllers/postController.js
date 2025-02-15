require('dotenv').config();
const Post = require('../models/postModel');

const postController = {
  createPost: async (req, res) => {
    try {
      console.log('=== Create Post Debug ===');
      console.log('User:', req.user, '| Body:', req.body, '| File:', req.file);

      const { content } = req.body;
      const user_id = req.user?.userId || req.user?.id;

      if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
      }

      if (!content && !req.file) {
        return res.status(400).json({ error: "Post content or media is required." });
      }

      // Handle file upload (image/video)
      const media_url = req.file
        ? `${process.env.NGROK_URL || 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net'}/uploads/posts/${req.file.filename}`
        : '';

      console.log('Creating post:', { content, user_id, media_url });

      const newPost = await Post.create(content, media_url, user_id);
      console.log('Post created:', newPost);
      res.status(201).json(newPost);

    } catch (error) {
      console.error('Error in createPost:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  getAllPosts: async (req, res) => {
    try {
      console.log('=== Fetching All Posts ===');
      const posts = await Post.getAllPosts();
      console.log('Total posts fetched:', posts.length);
      res.status(200).json(posts);
    } catch (error) {
      console.error('Error in getAllPosts:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      console.log('=== Fetching User Posts ===');

      const user_id = req.params.user_id || req.user?.userId || req.user?.id;

      if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
      }

      console.log('Fetching posts for:', user_id);
      const posts = await Post.getPostsByUserId(user_id);
      console.log(`Posts found for user ${user_id}:`, posts.length);
      res.status(200).json(posts);

    } catch (error) {
      console.error('Error in getUserPosts:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },
};

module.exports = postController;