const sql = require('mssql');
const { connectDB } = require('../config/db');

const Story = {
  async create(userId, username, imageUrl, hasStory = 0, viewed = 0, section = 'default') {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .input('username', sql.VarChar, username)
        .input('imageUrl', sql.VarChar, imageUrl)
        .input('hasStory', sql.Bit, hasStory)
        .input('viewed', sql.Bit, viewed)
        .input('section', sql.VarChar, section)
        .query(
          'INSERT INTO dbo.stories (user_id, username, image_url, has_story, viewed, section) ' +
          'VALUES (@userId, @username, @imageUrl, @hasStory, @viewed, @section); ' +
          'SELECT SCOPE_IDENTITY() AS story_id'
        );
      return result.recordset[0].story_id;
    } catch (error) {
      console.error('Error creating story:', error.message);
      throw error;
    }
  },

  async findByUserId(userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .query('SELECT * FROM dbo.stories WHERE user_id = @userId');
      return result.recordset || [];
    } catch (error) {
      console.error('Error finding stories by userId:', error.message);
      throw error;
    }
  },

  async deleteById(storyId, userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('storyId', sql.Int, storyId)
        .input('userId', sql.Int, userId)
        .query(
          'DELETE FROM dbo.stories WHERE story_id = @storyId AND user_id = @userId; ' +
          'SELECT @@ROWCOUNT AS deleted'
        );
      return result.recordset[0].deleted > 0;
    } catch (error) {
      console.error('Error deleting story:', error.message);
      throw error;
    }
  },
};

module.exports = Story;