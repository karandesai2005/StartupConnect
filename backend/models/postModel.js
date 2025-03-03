const { connectDB } = require('../config/db');
const sql = require('mssql');

const Post = {
  create: async (content, media_url, user_id) => {
    console.log('=== 🔹 Post Model Create Debug ===');
    console.log('📌 Creating post with:', { content, media_url, user_id });

    const query = `
      INSERT INTO posts (content, media_url, user_id) 
      OUTPUT 
        INSERTED.post_id,
        INSERTED.content,
        INSERTED.media_url,
        INSERTED.created_at,
        INSERTED.user_id,
        0 as like_count
      VALUES (@content, @media_url, @user_id)
    `;

    try {
      const pool = await connectDB();
      const request = pool.request()
        .input('content', sql.NVarChar, content)
        .input('media_url', sql.NVarChar, media_url || null)
        .input('user_id', sql.Int, user_id);
      
      const result = await request.query(query);
      console.log('✅ Post created successfully:', result.recordset[0]);
      return result.recordset[0];
    } catch (error) {
      console.error('❌ Database error in create:', error);
      throw new Error('Database error: Unable to create post.');
    }
  },

  getAllPosts: async () => {
    console.log('=== 🔹 Fetching All Posts With Likes ===');

    const query = `
      SELECT 
        p.post_id,
        p.content,
        p.media_url,
        p.created_at,
        p.user_id,
        u.username,
        u.name,
        u.profile_picture,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      ORDER BY p.created_at DESC;
    `;

    try {
      const pool = await connectDB();
      const result = await pool.request().query(query);
      console.log('✅ Total posts fetched:', result.recordset.length);
      return result.recordset;
    } catch (error) {
      console.error('❌ Database error in getAllPosts:', error);
      throw new Error('Database error: Unable to fetch posts.');
    }
  },

  getPostsByUserId: async (userId) => {
    console.log('=== 🔹 Fetching Posts for User:', userId);

    const query = `
      SELECT 
        p.post_id,
        p.content,
        p.media_url,
        p.created_at,
        p.user_id,
        u.username,
        u.name,
        u.profile_picture,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id 
      WHERE p.user_id = @user_id
      ORDER BY p.created_at DESC;
    `;

    try {
      const pool = await connectDB();
      const request = pool.request()
        .input('user_id', sql.Int, userId);
      const result = await request.query(query);
      console.log(`✅ Found ${result.recordset.length} posts for user ${userId}`);
      return result.recordset;
    } catch (error) {
      console.error('❌ Database error in getPostsByUserId:', error);
      throw new Error('Database error: Unable to fetch user posts.');
    }
  },

  getPostsByUsername: async (username) => {
    console.log('=== 🔹 Fetching Posts for Username:', username);

    const query = `
      SELECT 
        p.post_id,
        p.content,
        p.media_url,
        p.created_at,
        p.user_id,
        u.username,
        u.name,
        u.profile_picture,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id 
      WHERE u.username = @username
      ORDER BY p.created_at DESC;
    `;

    try {
      const pool = await connectDB();
      const request = pool.request()
        .input('username', sql.NVarChar, username);
      const result = await request.query(query);

      if (result.recordset.length === 0) {
        // Check if the user exists to differentiate between no posts and no user
        const userCheck = await pool.request()
          .input('username', sql.NVarChar, username)
          .query('SELECT 1 FROM users WHERE username = @username');
        if (userCheck.recordset.length === 0) {
          throw new Error('User not found');
        }
      }

      console.log(`✅ Found ${result.recordset.length} posts for username ${username}`);
      return result.recordset;
    } catch (error) {
      console.error('❌ Database error in getPostsByUsername:', error);
      if (error.message === 'User not found') {
        throw new Error('User not found');
      }
      throw new Error('Database error: Unable to fetch posts by username.');
    }
  },

  toggleLike: async (postId, userId) => {
    console.log('=== 🔹 Toggling Like ===');
    console.log('Post ID:', postId, 'User ID:', userId);

    const verifyQuery = `
      IF NOT EXISTS (SELECT 1 FROM posts WHERE post_id = @postId)
        THROW 50404, 'Post not found.', 1;
    `;

    const toggleQuery = `
      IF EXISTS (
        SELECT 1 FROM likes 
        WHERE post_id = @postId AND user_id = @userId
      )
      BEGIN
        DELETE FROM likes 
        WHERE post_id = @postId AND user_id = @userId;
        
        SELECT 
          0 as liked,
          (SELECT COUNT(*) FROM likes WHERE post_id = @postId) as likeCount;
      END
      ELSE
      BEGIN
        INSERT INTO likes (post_id, user_id) 
        VALUES (@postId, @userId);
        
        SELECT 
          1 as liked,
          (SELECT COUNT(*) FROM likes WHERE post_id = @postId) as likeCount;
      END
    `;

    try {
      const pool = await connectDB();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        await pool.request()
          .input('postId', sql.Int, postId)
          .query(verifyQuery);

        const result = await pool.request()
          .input('postId', sql.Int, postId)
          .input('userId', sql.Int, userId)
          .query(toggleQuery);

        await transaction.commit();
        console.log('✅ Like toggled successfully:', result.recordset[0]);
        return result.recordset[0];
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (error) {
      console.error('❌ Database error in toggleLike:', error);
      if (error.message.includes('Post not found')) {
        throw new Error('Post not found.');
      }
      throw new Error('Database error: Unable to toggle like.');
    }
  },

  getLikeStatus: async (postId, userId) => {
    console.log('=== 🔹 Getting Like Status ===');
    
    const query = `
      IF NOT EXISTS (SELECT 1 FROM posts WHERE post_id = @postId)
        THROW 50404, 'Post not found.', 1;

      SELECT 
        (SELECT COUNT(*) FROM likes WHERE post_id = @postId) as likeCount,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM likes 
            WHERE post_id = @postId AND user_id = @userId
          ) 
          THEN 1 
          ELSE 0 
        END as isLiked;
    `;

    try {
      const pool = await connectDB();
      const result = await pool.request()
        .input('postId', sql.Int, postId)
        .input('userId', sql.Int, userId)
        .query(query);

      console.log('✅ Like status retrieved:', result.recordset[0]);
      return result.recordset[0];
    } catch (error) {
      console.error('❌ Database error in getLikeStatus:', error);
      if (error.message.includes('Post not found')) {
        throw new Error('Post not found.');
      }
      throw new Error('Database error: Unable to get like status.');
    }
  }
};

module.exports = Post;