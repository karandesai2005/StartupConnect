const sql = require('mssql');
const { connectDB } = require('../config/db');

const Section = {
  async create(userId, type, title, content = null, imageUri = null) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .input('type', sql.VarChar, type)
        .input('title', sql.VarChar, title)
        .input('content', sql.Text, content)
        .input('imageUri', sql.VarChar, imageUri)
        .query(
          'INSERT INTO dbo.sections (user_id, type, title, content, image_uri) VALUES (@userId, @type, @title, @content, @imageUri); ' +
          'SELECT SCOPE_IDENTITY() AS section_id'
        );
      return result.recordset[0].section_id;
    } catch (error) {
      throw error;
    }
  },

  async findByUserId(userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .query('SELECT * FROM dbo.sections WHERE user_id = @userId');
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  async deleteById(sectionId, userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('sectionId', sql.Int, sectionId)
        .input('userId', sql.Int, userId)
        .query(
          'DELETE FROM dbo.sections WHERE section_id = @sectionId AND user_id = @userId; ' +
          'SELECT @@ROWCOUNT AS deleted'
        );
      return result.recordset[0].deleted > 0;
    } catch (error) {
      console.error('Error deleting section:', error.message);
      throw error;
    }
  },
};

module.exports = Section;