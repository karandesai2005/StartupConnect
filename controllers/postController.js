require('dotenv').config();
const Post = require('../models/postModel');
const User = require('../models/userModel');
const path = require('path');
const { supabase } = require('../services/supabase'); // Use centralized Supabase client

// Utility Functions
const getUserId = async (req) => {
  const uuid = req.user?.id;
  if (!uuid) throw new Error('User authentication required');

  const user = await User.getUserByUuid(uuid);
  return user?.user_id;
};

const validateId = (id, name) => {
  if (!id || isNaN(id)) throw new Error(`${name} must be a valid number`);
  return parseInt(id);
};

const determineMediaType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (['.mp4', '.mov', '.avi', '.wmv', '.3gp', '.mkv'].includes(ext)) return 'video';
  if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) return 'image';
  return null;
};

const postController = {
  createPost: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { content, tags } = req.body;
      let mediaUrl = null;
      let mediaType = null;

      if (req.file) {
        const fileName = `post-${Date.now()}${path.extname(req.file.originalname)}`;
        const { data, error } = await supabase.storage
          .from('posts')
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
          });

        if (error) {
          console.error('postController.js: Supabase upload error:', error.message);
          return res.status(500).json({ error: 'Failed to upload file' });
        }

        const { data: urlData } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        mediaUrl = urlData.publicUrl;
        mediaType = determineMediaType(fileName);
        console.log('postController.js: Processed file:', { mediaUrl, mediaType });
      }

      const parsedTags = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : []);

      const newPost = await Post.create(content || '', mediaUrl, mediaType, userId, parsedTags);
      console.log('postController.js: Post created:', newPost);

      res.status(201).json(newPost);
    } catch (error) {
      console.error('postController.js: Create post error:', error.message);
      res.status(error.message.includes('required') ? 400 : 500).json({ error: error.message });
    }
  },

  deletePost: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      const result = await Post.deletePost(validateId(postId, 'Post ID'), userId);
      console.log('postController.js: Post deleted:', { postId, userId });

      res.status(200).json({ message: 'Post deleted successfully', result });
    } catch (error) {
      console.error('postController.js: Delete post error:', error.message);
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
      console.log('postController.js: Fetched all posts:', { page, limit, count: posts.length });

      res.status(200).json(posts);
    } catch (error) {
      console.error('postController.js: Get all posts error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      const authUserId = await getUserId(req);
      if (!authUserId) return res.status(401).json({ error: 'User authentication required' });

      const { user_id } = req.query;
      const targetUserId = user_id ? validateId(user_id, 'User ID') : authUserId;

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const posts = await Post.getPostsByUserId(targetUserId, { limit: parseInt(limit), offset });
      console.log('postController.js: Fetched user posts:', { userId: targetUserId, page, limit, count: posts.length });

      res.status(200).json(posts);
    } catch (error) {
      console.error('postController.js: Get user posts error:', error.message);
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
      console.log('postController.js: Fetched posts by username:', { username, page, limit, count: posts.length });

      res.status(200).json(posts);
    } catch (error) {
      console.error('postController.js: Get posts by username error:', error.message);
      if (error.message.includes('User not found')) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Server error' });
    }
  },

  toggleLike: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      console.log('postController.js: ToggleLike attempt - Post ID:', postId, 'User ID:', userId);
      const result = await Post.toggleLike(validateId(postId, 'Post ID'), userId);
      console.log('postController.js: ToggleLike result:', result);

      res.status(200).json({ success: true, liked: result.liked, like_count: result.like_count });
    } catch (error) {
      console.error('postController.js: Toggle like error:', error.message);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getLikeStatus: async (req, response) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return response.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      const status = await Post.getLikeStatus(validateId(postId, 'Post ID'), userId);
      console.log('postController.js: Fetched like status:', { postId, userId, status });

      response.status(200).json(status);
    } catch (error) {
      console.error('postController.js: Get like status error:', error.message);
      if (error.message.includes('Post not found')) {
        return response.status(404).json({ error: 'Post not found' });
      }
      response.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getComments: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      console.log('postController.js: Get comments for Post ID:', postId);
      const { limit = 10, offset = 0 } = req.query;
      const comments = await Post.getCommentsByPostId(validateId(postId, 'Post ID'), { limit: parseInt(limit), offset });
      console.log('postController.js: Comments fetched:', comments);

      res.status(200).json(comments);
    } catch (error) {
      console.error('postController.js: Get comments error:', error.message);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  createComment: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      const { content } = req.body;
      console.log('postController.js: Create comment for Post ID:', postId, 'Content:', content);

      const newComment = await Post.createComment(
        validateId(postId, 'Post ID'),
        userId,
        content
      );
      console.log('postController.js: New comment created:', newComment);

      res.status(201).json(newComment);
    } catch (error) {
      console.error('postController.js: Create comment error:', error.message);
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