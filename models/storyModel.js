const sql = require('mssql');
const { connectDB } = require('../config/db');

const Story = {
  async create(userId, username, imageUrl, hasStory = 0, viewed = 0, caption = '') {
    try {
      const pool = await connectDB(); // Connect to the SQL Server database
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId) // User ID as integer
        .input('username', sql.VarChar, username) // Username as variable-length string
        .input('imageUrl', sql.VarChar, imageUrl) // Image URL as variable-length string
        .input('hasStory', sql.Bit, hasStory) // Boolean (0 or 1) for has_story
        .input('viewed', sql.Bit, viewed) // Boolean (0 or 1) for viewed
        .input('caption', sql.VarChar, caption || '') // Caption as variable-length string, defaulting to empty
        .query(
          'INSERT INTO dbo.stories (user_id, username, image_url, has_story, viewed, caption) ' +
          'VALUES (@userId, @username, @imageUrl, @hasStory, @viewed, @caption); ' +
          'SELECT SCOPE_IDENTITY() AS story_id'
        );
      return result.recordset[0].story_id; // Return the newly created story ID
    } catch (error) {
      throw error; // Propagate any errors to the caller
    }
  },

  async findByUserId(userId) {
    try {
      const pool = await connectDB(); // Connect to the SQL Server database
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId) // User ID as integer
        .query('SELECT * FROM dbo.stories WHERE user_id = @userId');
      return result.recordset; // Return all stories for the given user
    } catch (error) {
      throw error; // Propagate any errors to the caller
    }
  },
};

module.exports = Story;