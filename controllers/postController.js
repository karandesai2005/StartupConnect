require('dotenv').config();
const Post = require('../models/postModel');

// Constants
const BASE_URL = process.env.NGROK_URL || 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net';

// Utility Functions
const getUserId = (req) => req.user?.userId || req.user?.id;

const validateId = (id, name) => {
  if (!id || isNaN(id)) throw new Error(`${name} must be a valid number`);
  return parseInt(id);
};

// Post Controller
const postController = {
  createPost: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { content, tags } = req.body;
      const mediaUrl = req.file ? `${BASE_URL}/uploads/posts/${req.file.filename}` : null;
      const parsedTags = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : []);

      const newPost = await Post.create(content || '', mediaUrl, userId, parsedTags);

      res.status(201).json(newPost);
    } catch (error) {
      console.error('Create post error:', error.stack);
      res.status(error.message.includes('required') ? 400 : 500).json({ error: error.message });
    }
  },

  deletePost: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      const result = await Post.deletePost(validateId(postId, 'Post ID'), userId);

      res.status(200).json({ message: 'Post deleted successfully', result });
    } catch (error) {
      console.error('Delete post error:', error.stack);
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return res.status(403).json({ error: 'Post not found or unauthorized' });
      }
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getAllPosts: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const posts = await Post.getAllPosts({ limit: parseInt(limit), offset });

      res.status(200).json(posts);
    } catch (error) {
      console.error('Get all posts error:', error.stack);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const posts = await Post.getPostsByUserId(userId, { limit: parseInt(limit), offset });

      res.status(200).json(posts);
    } catch (error) {
      console.error('Get user posts error:', error.stack);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getPostsByUsername: async (req, res) => {
    try {
      const { username } = req.params;
      if (!username) return res.status(400).json({ error: 'Username required' });

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const posts = await Post.getPostsByUsername(username, { limit: parseInt(limit), offset });

      res.status(200).json(posts);
    } catch (error) {
      console.error('Get posts by username error:', error.stack);
      if (error.message.includes('User not found')) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Server error' });
    }
  },

  toggleLike: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      console.log('ToggleLike attempt - Post ID:', postId, 'User ID:', userId);
      const result = await Post.toggleLike(validateId(postId, 'Post ID'), userId);
      console.log('ToggleLike result:', result);

      res.status(200).json(result);
    } catch (error) {
      console.error('Toggle like error:', error.stack);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getLikeStatus: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      const status = await Post.getLikeStatus(validateId(postId, 'Post ID'), userId);

      res.status(200).json(status);
    } catch (error) {
      console.error('Get like status error:', error.stack);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getComments: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      console.log('Get comments for Post ID:', postId);
      const { limit = 10, offset = 0 } = req.query;
      const comments = await Post.getCommentsByPostId(validateId(postId, 'Post ID'), { limit: parseInt(limit), offset });
      console.log('Comments fetched:', comments);

      res.status(200).json(comments);
    } catch (error) {
      console.error('Get comments error:', error.stack);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  createComment: async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      const { content } = req.body;
      console.log('Create comment for Post ID:', postId, 'Content:', content);

      const newComment = await Post.createComment(
        validateId(postId, 'Post ID'),
        userId,
        content // Validation handled in model
      );
      console.log('New comment created:', newComment);

      res.status(201).json(newComment);
    } catch (error) {
      console.error('Create comment error:', error.stack);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      if (error.message.includes('Foreign key') || error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Server error' });
    }
  },
};

module.exports = postController;