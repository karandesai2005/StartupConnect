const sql = require('mssql');
const { connectDB } = require('../config/db'); // Changed to use connectDB

const Graph = {
  async create(userId, type, title, data) {
    try {
      const pool = await connectDB(); // Use connectDB to get the pool
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .input('type', sql.VarChar, type)
        .input('title', sql.VarChar, title)
        .input('data', sql.NVarChar, JSON.stringify(data))
        .query(
          'INSERT INTO dbo.graphs (user_id, type, title, data) VALUES (@userId, @type, @title, @data); SELECT SCOPE_IDENTITY() AS graph_id'
        );
      return result.recordset[0].graph_id;
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
        .query('SELECT * FROM dbo.graphs WHERE user_id = @userId');
      return result.recordset.map(row => ({ ...row, data: JSON.parse(row.data) }));
    } catch (error) {
      throw error;
    }
  },
};

module.exports = Graph;