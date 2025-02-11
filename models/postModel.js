const db = require('../config/db');

const Post = {
  create: async (content, image_url, user_id) => {
    console.log('=== Post Model Create Debug ===');
    console.log('Creating post with:', { content, image_url, user_id });
    
    const query = 'INSERT INTO posts (content, image_url, user_id) VALUES ($1, $2, $3) RETURNING *';
    const values = [content, image_url, user_id];
    
    console.log('Executing query:', { query, values });
    
    try {
      const result = await db.query(query, values);
      console.log('Query result:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Database error in create:', error);
      throw error;
    }
  },

  getAllPosts: async () => {
    console.log('=== Get All Posts Debug ===');
    const query = `
      SELECT 
        posts.*, 
        users.username, 
        users.name,
        users.profile_picture 
      FROM posts 
      JOIN users ON posts.user_id = users.user_id 
      ORDER BY posts.created_at DESC
    `;
    
    try {
      console.log('Executing getAllPosts query');
      const result = await db.query(query);
      console.log('Found posts:', result.rows.length);
      return result.rows;
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
        posts.*, 
        users.username, 
        users.name,
        users.profile_picture 
      FROM posts 
      JOIN users ON posts.user_id = users.user_id 
      WHERE posts.user_id = $1
      ORDER BY posts.created_at DESC
    `;
    
    try {
      const result = await db.query(query, [userId]);
      console.log('Found user posts:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('Database error in getPostsByUserId:', error);
      throw error;
    }
  }
};

module.exports = Post;