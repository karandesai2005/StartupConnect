const sql = require('mssql');
const { connectDB } = require('../config/db'); // Changed to use connectDB

const Section = {
  async create(userId, type, title, content = null, imageUri = null) {
    try {
      const pool = await connectDB(); // Use connectDB to get the pool
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .input('type', sql.VarChar, type)
        .input('title', sql.VarChar, title)
        .input('content', sql.Text, content)
        .input('imageUri', sql.VarChar, imageUri)
        .query(
          'INSERT INTO dbo.sections (user_id, type, title, content, image_uri) VALUES (@userId, @type, @title, @content, @imageUri); SELECT SCOPE_IDENTITY() AS section_id'
        );
      return result.recordset[0].section_id;
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
        .query('SELECT * FROM dbo.sections WHERE user_id = @userId');
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = Section;