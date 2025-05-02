require('dotenv').config();
const Post = require('../models/postModel');
const User = require('../models/userModel');
const path = require('path');
const { supabase } = require('../services/supabase');
const logger = require('../logger'); // Use winston logger

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
  createPost: [
    uploadPostMedia, // Use the updated middleware
    async (req, res) => {
      try {
        const userId = await getUserId(req);
        if (!userId) return res.status(401).json({ error: 'User authentication required' });

        const { content, tags } = req.body;
        let mediaUrl = null;
        let mediaType = null;

        if (req.file) {
          // Validate file type
          const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
          const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/mkv'];
          const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
          if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Only images (JPEG, PNG, GIF) and videos (MP4, MOV, AVI, MKV) allowed' });
          }

          const fileName = `post-${Date.now()}${path.extname(req.file.originalname)}`;
          const { data, error } = await supabase.storage
            .from('posts')
            .upload(fileName, req.file.buffer, {
              contentType: req.file.mimetype,
            });

          if (error) {
            logger.error(`Supabase upload error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to upload file' });
          }

          const { data: urlData } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);

          mediaUrl = urlData.publicUrl;
          mediaType = determineMediaType(fileName);
          logger.info('Processed file:', { mediaUrl, mediaType });
        }

        const parsedTags = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : []);

        const newPost = await Post.create(content || '', mediaUrl, mediaType, userId, parsedTags);
        logger.info('Post created:', newPost);

        res.status(201).json(newPost);
      } catch (error) {
        logger.error(`Create post error: ${error.message}`);
        res.status(error.message.includes('required') ? 400 : 500).json({ error: error.message });
      }
    },
  ],

  deletePost: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      const result = await Post.deletePost(validateId(postId, 'Post ID'), userId);
      logger.info('Post deleted:', { postId, userId });

      res.status(200).json({ message: 'Post deleted successfully', result });
    } catch (error) {
      logger.error(`Delete post error: ${error.message}`);
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
      logger.info('Fetched all posts:', { page, limit, count: posts.length });

      res.status(200).json(posts);
    } catch (error) {
      logger.error(`Get all posts error: ${error.message}`);
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
      logger.info('Fetched user posts:', { userId: targetUserId, page, limit, count: posts.length });

      res.status(200).json(posts);
    } catch (error) {
      logger.error(`Get user posts error: ${error.message}`);
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
      logger.info('Fetched posts by username:', { username, page, limit, count: posts.length });

      res.status(200).json(posts);
    } catch (error) {
      logger.error(`Get posts by username error: ${error.message}`);
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
      logger.info('ToggleLike attempt - Post ID:', postId, 'User ID:', userId);
      const result = await Post.toggleLike(validateId(postId, 'Post ID'), userId);
      logger.info('ToggleLike result:', result);

      res.status(200).json({ success: true, liked: result.liked, like_count: result.like_count });
    } catch (error) {
      logger.error(`Toggle like error: ${error.message}`);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getLikeStatus: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      const status = await Post.getLikeStatus(validateId(postId, 'Post ID'), userId);
      logger.info('Fetched like status:', { postId, userId, status });

      res.status(200).json(status);
    } catch (error) {
      logger.error(`Get like status error: ${error.message}`);
      if (error.message.includes('Post not found')) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(error.message.includes('valid number') ? 400 : 500).json({ error: error.message });
    }
  },

  getComments: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      logger.info('Get comments for Post ID:', postId);
      const { limit = 10, offset = 0 } = req.query;
      const comments = await Post.getCommentsByPostId(validateId(postId, 'Post ID'), { limit: parseInt(limit), offset });
      logger.info('Comments fetched:', comments);

      res.status(200).json(comments);
    } catch (error) {
      logger.error(`Get comments error: ${error.message}`);
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
      logger.info('Create comment for Post ID:', postId, 'Content:', content);

      const newComment = await Post.createComment(
        validateId(postId, 'Post ID'),
        userId,
        content
      );
      logger.info('New comment created:', newComment);

      res.status(201).json(newComment);
    } catch (error) {
      logger.error(`Create comment error: ${error.message}`);
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