const { connectDB } = require('../config/db');
const sql = require('mssql');

// Utility Function to Get DB Pool
const getPool = async () => {
  const pool = await connectDB();
  if (!pool) throw new Error('Database connection failed');
  return pool;
};

// Validation Functions
const validateId = (id, name) => {
  if (!id || isNaN(id)) throw new Error(`${name} must be a valid number`);
  return parseInt(id);
};

const validateContent = (content, maxLength = 1000) => {
  if (content && content.trim().length > maxLength) {
    throw new Error(`Content must be less than ${maxLength} characters`);
  }
  return content ? content.trim() : '';
};

const validateTags = (tags) => {
  if (!Array.isArray(tags)) throw new Error('Tags must be an array');
  if (tags.length > 20) throw new Error('Maximum 20 tags allowed');
  return JSON.stringify(tags);
};

const Post = {
  create: async (content, media_url, user_id, tags = []) => {
    if (!media_url && (!content || content.trim() === '')) {
      throw new Error('Content or media is required');
    }

    const query = `
      INSERT INTO posts (content, media_url, user_id, tags)
      OUTPUT 
        INSERTED.post_id,
        INSERTED.content,
        INSERTED.media_url,
        INSERTED.created_at,
        INSERTED.user_id,
        INSERTED.tags,
        0 as like_count
      VALUES (@content, @media_url, @user_id, @tags)
    `;

    try {
      const pool = await getPool();
      const request = pool.request()
        .input('content', sql.NVarChar, validateContent(content))
        .input('media_url', sql.NVarChar, media_url || null)
        .input('user_id', sql.Int, validateId(user_id, 'User ID'))
        .input('tags', sql.NVarChar, validateTags(tags));

      const result = await request.query(query);
      const post = result.recordset[0];
      post.tags = JSON.parse(post.tags); // Parse tags back to array for response
      return post;
    } catch (error) {
      console.error('Create post error:', error);
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to create post');
    }
  },

  getAllPosts: async ({ limit = 10, offset = 0 } = {}) => {
    const query = `
      SELECT 
        p.post_id,
        p.content,
        p.media_url,
        p.created_at,
        p.user_id,
        p.tags,
        u.username,
        u.name,
        u.profile_picture,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      ORDER BY p.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(query);
      return result.recordset.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : [],
      }));
    } catch (error) {
      console.error('Get all posts error:', error);
      throw new Error('Unable to fetch posts');
    }
  },

  getPostsByUserId: async (userId, { limit = 10, offset = 0 } = {}) => {
    const query = `
      SELECT 
        p.post_id,
        p.content,
        p.media_url,
        p.created_at,
        p.user_id,
        p.tags,
        u.username,
        u.name,
        u.profile_picture,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.user_id = @user_id
      ORDER BY p.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('user_id', sql.Int, validateId(userId, 'User ID'))
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(query);
      return result.recordset.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : [],
      }));
    } catch (error) {
      console.error('Get posts by user ID error:', error);
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to fetch user posts');
    }
  },

  deletePost: async (postId, userId) => {
    const queries = [
      'DELETE FROM likes WHERE post_id = @postId',
      'DELETE FROM comments WHERE post_id = @postId',
      'DELETE FROM posts WHERE post_id = @postId AND user_id = @userId',
    ];

    try {
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        const postIdValidated = validateId(postId, 'Post ID');
        const userIdValidated = validateId(userId, 'User ID');

        const verifyResult = await pool.request()
          .input('postId', sql.Int, postIdValidated)
          .input('userId', sql.Int, userIdValidated)
          .query('SELECT COUNT(*) as count FROM posts WHERE post_id = @postId AND user_id = @userId');

        if (verifyResult.recordset[0].count === 0) {
          throw new Error('Post not found or unauthorized');
        }

        for (const query of queries) {
          await pool.request()
            .input('postId', sql.Int, postIdValidated)
            .input('userId', sql.Int, userIdValidated)
            .query(query);
        }

        await transaction.commit();
        return { deleted: true };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Delete post error:', error);
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        throw new Error('Post not found or unauthorized');
      }
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to delete post');
    }
  },

  getPostsByUsername: async (username, { limit = 10, offset = 0 } = {}) => {
    const query = `
      SELECT 
        p.post_id,
        p.content,
        p.media_url,
        p.created_at,
        p.user_id,
        p.tags,
        u.username,
        u.name,
        u.profile_picture,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE u.username = @username
      ORDER BY p.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('username', sql.NVarChar, username) // Assuming username validation elsewhere
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(query);

      if (result.recordset.length === 0) {
        const userCheck = await pool.request()
          .input('username', sql.NVarChar, username)
          .query('SELECT 1 FROM users WHERE username = @username');
        if (userCheck.recordset.length === 0) throw new Error('User not found');
      }

      return result.recordset.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : [],
      }));
    } catch (error) {
      console.error('Get posts by username error:', error);
      if (error.message === 'User not found') throw new Error('User not found');
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to fetch posts by username');
    }
  },

  toggleLike: async (postId, userId) => {
    const toggleQuery = `
      IF EXISTS (SELECT 1 FROM posts WHERE post_id = @postId)
      BEGIN
        IF EXISTS (SELECT 1 FROM likes WHERE post_id = @postId AND user_id = @userId)
        BEGIN
          DELETE FROM likes WHERE post_id = @postId AND user_id = @userId;
          SELECT 0 as liked, (SELECT COUNT(*) FROM likes WHERE post_id = @postId) as likeCount;
        END
        ELSE
        BEGIN
          INSERT INTO likes (post_id, user_id) VALUES (@postId, @userId);
          SELECT 1 as liked, (SELECT COUNT(*) FROM likes WHERE post_id = @postId) as likeCount;
        END
      END
      ELSE THROW 50404, 'Post not found', 1;
    `;

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('postId', sql.Int, validateId(postId, 'Post ID'))
        .input('userId', sql.Int, validateId(userId, 'User ID'))
        .query(toggleQuery);

      return result.recordset[0];
    } catch (error) {
      console.error('Toggle like error:', error);
      if (error.message.includes('Post not found')) throw new Error('Post not found');
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to toggle like');
    }
  },

  getLikeStatus: async (postId, userId) => {
    const query = `
      IF NOT EXISTS (SELECT 1 FROM posts WHERE post_id = @postId)
        THROW 50404, 'Post not found', 1;
      SELECT 
        (SELECT COUNT(*) FROM likes WHERE post_id = @postId) as likeCount,
        CASE WHEN EXISTS (SELECT 1 FROM likes WHERE post_id = @postId AND user_id = @userId)
          THEN 1 ELSE 0 END as isLiked;
    `;

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('postId', sql.Int, validateId(postId, 'Post ID'))
        .input('userId', sql.Int, validateId(userId, 'User ID'))
        .query(query);

      return result.recordset[0];
    } catch (error) {
      console.error('Get like status error:', error);
      if (error.message.includes('Post not found')) throw new Error('Post not found');
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to get like status');
    }
  },

  getCommentsByPostId: async (postId, { limit = 10, offset = 0 } = {}) => {
    const query = `
      SELECT 
        c.comment_id,
        c.content,
        c.created_at,
        c.user_id,
        u.username
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.post_id = @postId
      ORDER BY c.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('postId', sql.Int, validateId(postId, 'Post ID'))
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(query);
      return result.recordset;
    } catch (error) {
      console.error('Get comments error:', error);
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to fetch comments');
    }
  },

  createComment: async (postId, userId, content) => {
    const query = `
      INSERT INTO comments (post_id, user_id, content, created_at)
      OUTPUT 
        INSERTED.comment_id,
        INSERTED.content,
        INSERTED.created_at,
        INSERTED.user_id
      VALUES (@postId, @userId, @content, GETDATE());
    `;

    try {
      const pool = await getPool();
      const request = pool.request()
        .input('postId', sql.Int, validateId(postId, 'Post ID'))
        .input('userId', sql.Int, validateId(userId, 'User ID'))
        .input('content', sql.NVarChar, validateContent(content));

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      console.error('Create comment error:', error);
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to create comment');
    }
  },
};

module.exports = Post;