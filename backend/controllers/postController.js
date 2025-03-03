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
      const user_id = req.user?.userId || req.user?.id; // For /posts/myposts, use authenticated user's ID

      if (!user_id) {
        return res.status(400).json({ error: "User ID is required." });
      }

      console.log('Fetching posts for user_id:', user_id);
      const posts = await Post.getPostsByUserId(user_id);
      console.log(`Posts found for user ${user_id}:`, posts.length);
      res.status(200).json(posts);
    } catch (error) {
      console.error('Error in getUserPosts:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  getPostsByUsername: async (req, res) => {
    try {
      console.log('=== Fetching Posts by Username ===');
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({ error: "Username is required." });
      }

      console.log('Fetching posts for username:', username);
      const posts = await Post.getPostsByUsername(username); // Assumes postModel has this method
      console.log(`Posts found for user ${username}:`, posts.length);
      res.status(200).json(posts);
    } catch (error) {
      console.error('Error in getPostsByUsername:', error);
      if (error.message.includes('User not found')) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  toggleLike: async (req, res) => {
    try {
      console.log('=== Toggle Like Debug ===');
      const { postId } = req.params;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
      }

      if (!postId) {
        return res.status(400).json({ error: "Post ID is required." });
      }

      console.log('Toggling like for:', { postId, userId });
      const result = await Post.toggleLike(parseInt(postId), userId);
      console.log('Like toggled:', result);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in toggleLike:', error);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  getLikeStatus: async (req, res) => {
    try {
      console.log('=== Get Like Status Debug ===');
      const { postId } = req.params;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
      }

      if (!postId) {
        return res.status(400).json({ error: "Post ID is required." });
      }

      console.log('Getting like status for:', { postId, userId });
      const status = await Post.getLikeStatus(parseInt(postId), userId);
      console.log('Like status retrieved:', status);
      res.status(200).json(status);
    } catch (error) {
      console.error('Error in getLikeStatus:', error);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  }
};

module.exports = postController;