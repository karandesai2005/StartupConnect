const { queryDB } = require('../config/db'); // Use queryDB instead of connectDB

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
      INSERT INTO public.posts (content, media_url, user_id, tags, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING post_id, content, media_url, created_at, user_id, tags, 0 AS like_count;
    `;

    try {
      const result = await queryDB(query, [
        validateContent(content),
        media_url || null,
        validateId(user_id, 'User ID'),
        validateTags(tags)
      ]);
      const post = result[0]; // queryDB returns rows array
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
        (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.post_id) AS like_count,
        (SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.post_id) AS comment_count
      FROM public.posts p
      JOIN public.users u ON p.user_id = u.user_id
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $1;
    `;

    try {
      const result = await queryDB(query, [offset, limit]);
      return result.map(post => ({
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
        (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.post_id) AS like_count,
        (SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.post_id) AS comment_count
      FROM public.posts p
      JOIN public.users u ON p.user_id = u.user_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT $3 OFFSET $2;
    `;

    try {
      const result = await queryDB(query, [
        validateId(userId, 'User ID'),
        offset,
        limit
      ]);
      return result.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : [],
      }));
    } catch (error) {
      console.error('Get posts by user ID error:', error);
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to fetch user posts');
    }
  },

  deletePost: async (postId, userId) => {
    const postIdValidated = validateId(postId, 'Post ID');
    const userIdValidated = validateId(userId, 'User ID');

    try {
      // Verify ownership
      const verifyResult = await queryDB(
        'SELECT COUNT(*) AS count FROM public.posts WHERE post_id = $1 AND user_id = $2',
        [postIdValidated, userIdValidated]
      );
      if (verifyResult[0].count === 0) {
        throw new Error('Post not found or unauthorized');
      }

      // Execute deletes
      await queryDB('DELETE FROM public.likes WHERE post_id = $1', [postIdValidated]);
      await queryDB('DELETE FROM public.comments WHERE post_id = $1', [postIdValidated]);
      await queryDB('DELETE FROM public.posts WHERE post_id = $1 AND user_id = $2', [postIdValidated, userIdValidated]);

      return { deleted: true };
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
        (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.post_id) AS like_count,
        (SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.post_id) AS comment_count
      FROM public.posts p
      JOIN public.users u ON p.user_id = u.user_id
      WHERE u.username = $1
      ORDER BY p.created_at DESC
      LIMIT $3 OFFSET $2;
    `;

    try {
      const result = await queryDB(query, [username, offset, limit]);

      if (result.length === 0) {
        const userCheck = await queryDB(
          'SELECT 1 FROM public.users WHERE username = $1',
          [username]
        );
        if (userCheck.length === 0) throw new Error('User not found');
      }

      return result.map(post => ({
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
    const checkPostQuery = 'SELECT 1 FROM public.posts WHERE post_id = $1';
    const insertQuery = `
      INSERT INTO public.likes (post_id, user_id)
      ON CONFLICT (post_id, user_id) DO NOTHING
      RETURNING TRUE AS liked;
    `;
    const deleteQuery = `
      DELETE FROM public.likes WHERE post_id = $1 AND user_id = $2
      RETURNING FALSE AS liked;
    `;
    const countQuery = `
      SELECT COUNT(*) AS like_count FROM public.likes WHERE post_id = $1;
    `;

    try {
      const postIdValidated = validateId(postId, 'Post ID');
      const userIdValidated = validateId(userId, 'User ID');

      // Verify post exists
      const postCheck = await queryDB(checkPostQuery, [postIdValidated]);
      if (postCheck.length === 0) throw new Error('Post not found');

      // Check if like exists
      const likeCheck = await queryDB(
        'SELECT 1 FROM public.likes WHERE post_id = $1 AND user_id = $2',
        [postIdValidated, userIdValidated]
      );

      let result;
      if (likeCheck.length > 0) {
        result = await queryDB(deleteQuery, [postIdValidated, userIdValidated]);
      } else {
        result = await queryDB(insertQuery, [postIdValidated, userIdValidated]);
      }

      // Get the updated like count
      const countResult = await queryDB(countQuery, [postIdValidated]);
      result[0].like_count = countResult[0].like_count;

      return result[0];
    } catch (error) {
      console.error('Toggle like error:', error);
      if (error.message.includes('Post not found')) throw new Error('Post not found');
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to toggle like');
    }
  },

  getLikeStatus: async (postId, userId) => {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM public.likes WHERE post_id = $1) AS like_count,
        CASE WHEN EXISTS (SELECT 1 FROM public.likes WHERE post_id = $1 AND user_id = $2)
          THEN 1 ELSE 0 END AS is_liked
      WHERE EXISTS (SELECT 1 FROM public.posts WHERE post_id = $1);
    `;

    try {
      const result = await queryDB(query, [
        validateId(postId, 'Post ID'),
        validateId(userId, 'User ID')
      ]);

      if (result.length === 0) throw new Error('Post not found');
      return result[0];
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
      FROM public.comments c
      JOIN public.users u ON c.user_id = u.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
      LIMIT $3 OFFSET $2;
    `;

    try {
      const result = await queryDB(query, [
        validateId(postId, 'Post ID'),
        offset,
        limit
      ]);
      return result;
    } catch (error) {
      console.error('Get comments error:', error);
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to fetch comments');
    }
  },

  createComment: async (postId, userId, content) => {
    const query = `
      INSERT INTO public.comments (post_id, user_id, content, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING comment_id, content, created_at, user_id;
    `;

    try {
      const result = await queryDB(query, [
        validateId(postId, 'Post ID'),
        validateId(userId, 'User ID'),
        validateContent(content)
      ]);
      return result[0];
    } catch (error) {
      console.error('Create comment error:', error);
      throw new Error(error.message.includes('must be') ? error.message : 'Unable to create comment');
    }
  },
};

module.exports = Post;