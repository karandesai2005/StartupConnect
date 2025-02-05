const db = require('../config/db');

const Post = {
  create: async (content, image_url, user_id) => {
    const result = await db.query(
      'INSERT INTO posts (content, image_url, user_id) VALUES ($1, $2, $3) RETURNING *',
      [content, image_url, user_id]
    );
    return result.rows[0];
  },

  getAllPosts: async () => {
    const result = await db.query(
      `SELECT 
        posts.*, 
        users.username, 
        users.name,
        users.profile_picture 
       FROM posts 
       JOIN users ON posts.user_id = users.user_id 
       ORDER BY posts.created_at DESC`
    );
    return result.rows;
  },
};

module.exports = Post;