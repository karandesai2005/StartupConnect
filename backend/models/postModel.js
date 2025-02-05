const db = require('../config/db');

const Post = {
  create: async (startup_id, content) => {
    const result = await db.query(
      'INSERT INTO posts (startup_id, content) VALUES ($1, $2) RETURNING *',
      [startup_id, content]
    );
    return result.rows[0];
  },

  getAllPosts: async () => {
    const result = await db.query(
      'SELECT posts.*, users.username, users.profile_picture FROM posts JOIN users ON posts.startup_id = users.user_id ORDER BY posts.created_at DESC'
    );
    return result.rows;
  },

  getPostsByUserId: async (user_id) => {
    const result = await db.query(
      'SELECT * FROM posts WHERE startup_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    return result.rows;
  },
};

module.exports = Post;
