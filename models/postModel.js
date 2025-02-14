const { connectDB } = require('../config/db'); // Use connectDB from db.js
const sql = require('mssql');

const Post = {
  create: async (content, image_url, user_id) => {
    console.log('=== Post Model Create Debug ===');
    console.log('Creating post with:', { content, image_url, user_id });

    const query = `
      INSERT INTO posts (content, image_url, user_id) 
      OUTPUT INSERTED.*
      VALUES (@content, @image_url, @user_id)
    `;

    try {
      const pool = await connectDB(); // 🔹 Correctly get the pool instance
      const result = await pool.request()
        .input('content', sql.NVarChar, content)
        .input('image_url', sql.NVarChar, image_url)
        .input('user_id', sql.Int, user_id)
        .query(query);

      console.log('Query result:', result.recordset[0]);
      return result.recordset[0];
    } catch (error) {
      console.error('Database error in create:', error);
      throw error;
    }
  },

  getAllPosts: async () => {
    console.log('=== Get All Posts Debug ===');

    const query = `
      SELECT 
        p.*, 
        u.username, 
        u.name,
        u.profile_picture 
      FROM posts p
      JOIN users u ON p.user_id = u.user_id 
      ORDER BY p.created_at DESC
    `;

    try {
      const pool = await connectDB();
      const result = await pool.request().query(query);

      console.log('Found posts:', result.recordset.length);
      return result.recordset;
    } catch (error) {
      console.error('Database error in getAllPosts:', error);
      throw error;
    }
  },
  
  getPostsByUserId: async (userId) => {
    console.log('=== Get Posts By User ID Debug ===');
    console.log('Getting posts for user:', userId);

    const query = `
      SELECT 
        p.*, 
        u.username, 
        u.name,
        u.profile_picture 
      FROM posts p
      JOIN users u ON p.user_id = u.user_id 
      WHERE p.user_id = @user_id
      ORDER BY p.created_at DESC
    `;

    try {
      const pool = await connectDB();
      const result = await pool.request()
        .input('user_id', sql.Int, userId)
        .query(query);

      console.log('Found user posts:', result.recordset.length);
      return result.recordset;
    } catch (error) {
      console.error('Database error in getPostsByUserId:', error);
      throw error;
    }
  }
};

module.exports = Post;
