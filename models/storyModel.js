const sql = require('mssql');
const { connectDB } = require('../config/db');

const Story = {
  async create(userId, username, imageUrl, hasStory = 0, viewed = 0, section = 'default', sectionId = null, profilePicture = null) {
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
        .input('sectionId', sql.Int, sectionId)
        .input('profilePicture', sql.VarChar, profilePicture)
        .query(
          'INSERT INTO dbo.stories (user_id, username, image_url, has_story, viewed, section, section_id, profile_picture) ' +
          'VALUES (@userId, @username, @imageUrl, @hasStory, @viewed, @section, @sectionId, @profilePicture); ' +
          'SELECT SCOPE_IDENTITY() AS story_id'
        );
      const storyId = result.recordset[0].story_id;
      console.log(`Created story with ID: ${storyId} for userId: ${userId}, sectionId: ${sectionId}`);
      return storyId;
    } catch (error) {
      console.error('Error in Story.create:', error.message, error.stack);
      throw error;
    }
  },

  async findByUserId(userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .query(`
          SELECT story_id, user_id, username, image_url, has_story, viewed, section, section_id, profile_picture
          FROM dbo.stories
          WHERE user_id = @userId
        `);
      const stories = result.recordset || [];
      console.log(`Stories retrieved for userId ${userId}:`, stories);
      return stories;
    } catch (error) {
      console.error('Error in Story.findByUserId:', error.message, error.stack);
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
      const deleted = result.recordset[0].deleted > 0;
      console.log(`Deleted story with ID ${storyId} for userId ${userId}: ${deleted}`);
      return deleted;
    } catch (error) {
      console.error('Error in Story.deleteById:', error.message, error.stack);
      throw error;
    }
  },
};

module.exports = Story;