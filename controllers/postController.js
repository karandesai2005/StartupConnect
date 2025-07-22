const { supabase } = require('../services/supabase');
const { queryDB } = require('../config/db');
const logger = require('../logger');
const path = require('path');

// Constants
const MAX_FILE_SIZE_POST = 100 * 1024 * 1024; // 100MB for posts

// Utility Functions
const getUserId = async (req) => {
  const uuid = req.user?.id;
  if (!uuid) {
    logger.error('getUserId: User authentication required - req.user is undefined');
    throw new Error('User authentication required');
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('user_id')
    .eq('supabase_uid', uuid)
    .single();
  if (error || !user) {
    logger.error(`getUserId: User not found - Supabase error: ${error?.message}`);
    throw new Error('User not found');
  }
  return user.user_id;
};

const cleanUrl = (url) => {
  if (!url || typeof url !== 'string') {
    logger.warn('cleanUrl: Invalid or empty URL provided');
    return null;
  }
  let cleaned = url;
  while (cleaned.includes('https:/') || cleaned.includes('http:/')) {
    cleaned = cleaned
      .replace(/https:\/+/g, 'https://')
      .replace(/http:\/+/g, 'https://');
  }
  cleaned = cleaned.replace(/\/+/g, '/');
  cleaned = cleaned.replace(/\/[uU][pP][lL][oO][aA][dD][sS]\//g, '/uploads/');
  cleaned = cleaned.replace(/^http:/, 'https:');
  cleaned = cleaned.replace(/\/+$/, '');
  try {
    new URL(cleaned);
    logger.info(`cleanUrl: Normalized URL: ${url} -> ${cleaned}`);
    return cleaned;
  } catch (error) {
    logger.warn(`cleanUrl: Invalid URL format: ${url} -> ${cleaned}, error: ${error.message}`);
    return null;
  }
};

// Cache for cleaned URLs (simple in-memory cache)
const urlCache = new Map();

const getCleanedUrl = (url) => {
  if (!url) return null;
  const cached = urlCache.get(url);
  if (cached) return cached;
  const cleaned = cleanUrl(url);
  if (cleaned) urlCache.set(url, cleaned);
  return cleaned;
};

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
]);

const fixDatabaseURLs = async () => {
  try {
    const selectQuery = `
      SELECT post_id, media_url
      FROM posts
      WHERE media_url LIKE '%https:/%' OR media_url ~* '/[uU][pP][lL][oO][aA][dD][sS]/';
    `;
    const affectedRows = await queryDB(selectQuery, []);
    if (affectedRows.length > 0) {
      logger.info(`fixDatabaseURLs: Found ${affectedRows.length} problematic URLs:`, 
        affectedRows.map(row => ({ post_id: row.post_id, media_url: row.media_url })));
    } else {
      logger.info('fixDatabaseURLs: No problematic URLs found');
    }

    const updateQuery = `
      UPDATE posts
      SET media_url = REGEXP_REPLACE(
        REGEXP_REPLACE(media_url, 'https?:\/+', 'https://'),
        '/[uU][pP][lL][oO][aA][dD][sS]/', '/uploads/'
      )
      WHERE media_url LIKE '%https:/%' OR media_url ~* '/[uU][pP][lL][oO][aA][dD][sS]/'
      RETURNING post_id, media_url;
    `;
    const updatedRows = await queryDB(updateQuery, []);
    logger.info(`fixDatabaseURLs: Updated ${updatedRows.length} URLs:`, 
      updatedRows.map(row => ({ post_id: row.post_id, media_url: row.media_url })));
  } catch (error) {
    logger.error(`fixDatabaseURLs: Error fixing database URLs: ${error.message}`, error.stack);
    throw error;
  }
};

// Post Controller
const postController = {
  createPost: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      if (!req.file) {
        return res.status(400).json({ error: 'Media file required' });
      }

      logger.info(`createPost: File received for user ${userId}: ${req.file.originalname}, MIME: ${req.file.mimetype}, Size: ${req.file.size}`);

      if (req.file.size > MAX_FILE_SIZE_POST) {
        return res.status(400).json({ error: 'File size exceeds 100MB limit' });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'video/mov'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Only images (JPEG, PNG, GIF) and videos (MP4, MOV) allowed for posts' });
      }

      logger.info(`createPost: Request body for user ${userId}:`, req.body);

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const fileName = `post-${Date.now()}${path.extname(req.file.originalname)}`;

      const { data, error } = await withTimeout(
        supabase.storage.from('posts').upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        }),
        30000
      );

      if (error) {
        logger.error(`createPost: Supabase upload error for user ${userId}: ${error.message}`);
        return res.status(500).json({ error: 'Failed to upload post media' });
      }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
      const rawMediaUrl = urlData.publicUrl;
      const mediaUrl = getCleanedUrl(rawMediaUrl);
      if (!mediaUrl) {
        logger.error(`createPost: Invalid media URL after cleaning: raw=${rawMediaUrl}`);
        return res.status(500).json({ error: 'Invalid media URL generated' });
      }
      logger.info(`createPost: Post media uploaded for user ${userId}: raw=${rawMediaUrl}, cleaned=${mediaUrl}`);

      const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

      const query = `
        INSERT INTO posts (user_id, content, media_url, media_type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING post_id, user_id, content, media_url, media_type, created_at
      `;
      const values = [userId, content, mediaUrl, mediaType];
      const result = await queryDB(query, values);

      const newPost = result[0];
      logger.info(`createPost: Post created for user ${userId}:`, {
        post_id: newPost.post_id,
        media_url: newPost.media_url,
        media_type: newPost.media_type
      });

      res.status(201).json({
        post_id: newPost.post_id,
        user_id: newPost.user_id,
        content: newPost.content,
        media_url: newPost.media_url,
        media_type: newPost.media_type,
        created_at: newPost.created_at,
      });
    } catch (error) {
      logger.error(`createPost: Error for user ${req.user?.id || 'unknown'}: ${error.message}`, error.stack);
      res.status(error.message.includes('required') ? 400 : 500).json({ error: error.message });
    }
  },

  getAllPosts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const query = `
        SELECT p.post_id, p.user_id, u.username, u.name, p.media_url, p.content, p.created_at, p.media_type,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) AS like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) AS comment_count,
               u.profile_picture
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const values = [limit, offset];
      const posts = await queryDB(query, values);

      res.json(posts.map(post => {
        const cleanedMediaUrl = getCleanedUrl(post.media_url);
        const cleanedProfilePicture = getCleanedUrl(post.profile_picture || '');
        logger.info(`getAllPosts: Post ${post.post_id}: raw_media_url=${post.media_url}, cleaned_media_url=${cleanedMediaUrl}, raw_profile_picture=${post.profile_picture}, cleaned_profile_picture=${cleanedProfilePicture}`);
        return {
          ...post,
          media_url: cleanedMediaUrl,
          profile_picture: cleanedProfilePicture,
          name: post.name || post.username,
          comment_count: Number(post.comment_count) || 0,
          like_count: Number(post.like_count) || 0,
        };
      }));
    } catch (error) {
      logger.error(`getAllPosts: Error: ${error.message}`, error.stack);
      res.status(500).json({ error: 'Server error' });
    }
  },

  getMyPosts: async (req, res) => {
    try {
      let userId;

      if (req.query.user_id) {
        userId = req.query.user_id;
        if (isNaN(userId)) {
          return res.status(400).json({ error: 'User ID must be a valid number' });
        }
      } else {
        userId = await getUserId(req);
        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const query = `
        SELECT p.post_id, p.user_id, u.username, u.name, p.media_url, p.content, p.created_at, p.media_type,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) AS like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) AS comment_count,
               u.profile_picture
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const values = [userId, limit, offset];
      const posts = await queryDB(query, values);

      res.json(posts.map(post => {
        const cleanedMediaUrl = getCleanedUrl(post.media_url);
        const cleanedProfilePicture = getCleanedUrl(post.profile_picture || '');
        logger.info(`getMyPosts: Post ${post.post_id} for user ${userId}: raw_media_url=${post.media_url}, cleaned_media_url=${cleanedMediaUrl}, raw_profile_picture=${post.profile_picture}, cleaned_profile_picture=${cleanedProfilePicture}`);
        return {
          ...post,
          media_url: cleanedMediaUrl,
          profile_picture: cleanedProfilePicture,
          name: post.name || post.username,
          comment_count: Number(post.comment_count) || 0,
          like_count: Number(post.like_count) || 0,
        };
      }));
    } catch (error) {
      logger.error(`getMyPosts: Error for user ${req.user?.id || 'unknown'}: ${error.message}`, error.stack);
      res.status(error.message.includes('User ID') || error.message.includes('authentication') ? 400 : 500).json({ error: error.message });
    }
  },

  toggleLike: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: 'Post ID must be a valid number' });
      }

      const postQuery = 'SELECT user_id FROM posts WHERE post_id = $1';
      const postResult = await queryDB(postQuery, [postId]);
      if (postResult.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const checkLikeQuery = 'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2';
      const likeResult = await queryDB(checkLikeQuery, [userId, postId]);
      let liked = likeResult.length > 0;

      if (liked) {
        const deleteLikeQuery = 'DELETE FROM likes WHERE user_id = $1 AND post_id = $2';
        await queryDB(deleteLikeQuery, [userId, postId]);
        liked = false;
      } else {
        const insertLikeQuery = 'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)';
        await queryDB(insertLikeQuery, [userId, postId]);
        liked = true;
      }

      const likeCountQuery = 'SELECT COUNT(*) as count FROM likes WHERE post_id = $1';
      const likeCountResult = await queryDB(likeCountQuery, [postId]);
      const likeCount = Number(likeCountResult[0].count) || 0;

      res.status(200).json({ success: true, liked, like_count: likeCount });
    } catch (error) {
      logger.error(`toggleLike: Error for user ${req.user?.id || 'unknown'}, post ${req.params.postId}: ${error.message}`, error.stack);
      res.status(error.message.includes('Post ID') ? 400 : 500).json({ error: error.message });
    }
  },

  getLikes: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: 'Post ID must be a valid number' });
      }

      const postQuery = 'SELECT user_id FROM posts WHERE post_id = $1';
      const postResult = await queryDB(postQuery, [postId]);
      if (postResult.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const likeCountQuery = 'SELECT COUNT(*) as count FROM likes WHERE post_id = $1';
      const likeCountResult = await queryDB(likeCountQuery, [postId]);
      const likeCount = Number(likeCountResult[0].count) || 0;

      const userLikedQuery = 'SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2 LIMIT 1';
      const userLikedResult = await queryDB(userLikedQuery, [userId, postId]);
      const isLiked = userLikedResult.length > 0 ? 1 : 0;

      res.status(200).json({ likeCount, isLiked });
    } catch (error) {
      logger.error(`getLikes: Error for user ${req.user?.id || 'unknown'}, post ${req.params.postId}: ${error.message}`, error.stack);
      res.status(error.message.includes('Post ID') ? 400 : 500).json({ error: error.message });
    }
  },

  addComment: async (req, res) => {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'User authentication required' });

      const { postId } = req.params;
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: 'Post ID must be a valid number' });
      }

      const { content } = req.body;
      if (!content || content.length < 1 || content.length > 500) {
        return res.status(400).json({ error: 'Comment must be 1-500 characters' });
      }

      const postQuery = 'SELECT user_id FROM posts WHERE post_id = $1';
      const postResult = await queryDB(postQuery, [postId]);
      if (postResult.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const query = `
        INSERT INTO comments (post_id, user_id, content, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING comment_id, post_id, user_id, content, created_at
      `;
      const values = [postId, userId, content];
      const result = await queryDB(query, values);

      const newComment = result[0];
      res.status(201).json(newComment);
    } catch (error) {
      logger.error(`addComment: Error for user ${req.user?.id || 'unknown'}, post ${req.params.postId}: ${error.message}`, error.stack);
      res.status(error.message.includes('Post ID') || error.message.includes('Comment') ? 400 : 500).json({ error: error.message });
    }
  },

  getComments: async (req, res) => {
    try {
      const { postId } = req.params;
      if (!postId || isNaN(postId)) {
        return res.status(400).json({ error: 'Post ID must be a valid number' });
      }

      const postQuery = 'SELECT user_id FROM posts WHERE post_id = $1';
      const postResult = await queryDB(postQuery, [postId]);
      if (postResult.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const query = `
        SELECT c.comment_id, c.post_id, c.user_id, u.username, c.content, c.created_at
        FROM comments c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.post_id = $1
        ORDER BY c.created_at DESC
      `;
      const comments = await queryDB(query, [postId]);

      res.json(comments);
    } catch (error) {
      logger.error(`getComments: Error for post ${req.params.postId}: ${error.message}`, error.stack);
      res.status(error.message.includes('Post ID') ? 400 : 500).json({ error: error.message });
    }
  },

  fixMediaURLs: async (req, res) => {
    try {
      await fixDatabaseURLs();
      res.status(200).json({ message: 'Media URLs normalized in database' });
    } catch (error) {
      logger.error(`fixMediaURLs: Error: ${error.message}`, error.stack);
      res.status(500).json({ error: 'Server error' });
    }
  },
};

module.exports = postController;