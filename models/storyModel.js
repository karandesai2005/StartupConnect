const sql = require('mssql');
const { connectDB } = require('../config/db'); // Changed to use connectDB

const Story = {
  async create(userId, username, imageUrl, hasStory = 0, viewed = 0) {
    try {
      const pool = await connectDB(); // Use connectDB to get the pool
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .input('username', sql.VarChar, username)
        .input('imageUrl', sql.VarChar, imageUrl)
        .input('hasStory', sql.Bit, hasStory)
        .input('viewed', sql.Bit, viewed)
        .query(
          'INSERT INTO dbo.stories (user_id, username, image_url, has_story, viewed) VALUES (@userId, @username, @imageUrl, @hasStory, @viewed); SELECT SCOPE_IDENTITY() AS story_id'
        );
      return result.recordset[0].story_id;
    } catch (error) {
      throw error;
    }
  },

  async findByUserId(userId) {
    try {
      const pool = await connectDB(); // Use connectDB to get the pool
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .query('SELECT * FROM dbo.stories WHERE user_id = @userId');
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = Story;