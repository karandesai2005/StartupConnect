const { connectDB } = require('../config/db'); // Import connectDB
const sql = require('mssql');

const Post = {
  create: async (content, media_url, user_id) => {
    console.log('=== 🔹 Post Model Create Debug ===');
    console.log('📌 Creating post with:', { content, media_url, user_id });

    const query = `
      INSERT INTO posts (content, media_url, user_id) 
      OUTPUT INSERTED.*
      VALUES (@content, @media_url, @user_id)
    `;

    try {
      const pool = await connectDB();
      const request = pool.request()
        .input('content', sql.NVarChar, content)
        .input('media_url', media_url ? sql.NVarChar : sql.NVarChar, media_url || null) // Handle NULL cases
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
    console.log('=== 🔹 Fetching All Posts ===');

    const query = `
      SELECT 
        p.post_id, p.content, p.media_url, p.created_at, 
        u.user_id, u.username, u.name, u.profile_picture 
      FROM posts p
      JOIN users u ON p.user_id = u.user_id 
      ORDER BY p.created_at DESC
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
        p.post_id, p.content, p.media_url, p.created_at, 
        u.user_id, u.username, u.name, u.profile_picture 
      FROM posts p
      JOIN users u ON p.user_id = u.user_id 
      WHERE p.user_id = @user_id
      ORDER BY p.created_at DESC
    `;

    try {
      const pool = await connectDB();
      const request = pool.request().input('user_id', sql.Int, userId);
      const result = await request.query(query);

      console.log(`✅ Found ${result.recordset.length} posts for user ${userId}`);
      return result.recordset;

    } catch (error) {
      console.error('❌ Database error in getPostsByUserId:', error);
      throw new Error('Database error: Unable to fetch user posts.');
    }
  }
};

module.exports = Post;
