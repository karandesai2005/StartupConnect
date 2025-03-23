const sql = require('mssql');
const { connectDB } = require('../config/db');

const User = {
  async getUserByEmail(email) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('email', sql.VarChar, email)
        .query('SELECT * FROM dbo.users WHERE email = @email');
      return result.recordset[0];
    } catch (error) {
      console.error('Error in getUserByEmail:', error.message);
      throw error;
    }
  },

  async getUserByUsername(username) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('username', sql.VarChar, username)
        .query(`
          SELECT u.*, 
                 (SELECT COUNT(*) FROM dbo.followers WHERE followee_id = u.user_id) AS followers,
                 (SELECT COUNT(*) FROM dbo.followers WHERE follower_id = u.user_id) AS following
          FROM dbo.users u
          WHERE u.username = @username
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('Error in getUserByUsername:', error.message);
      throw error;
    }
  },

  async getUserById(userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .query(`
          SELECT u.*, 
                 (SELECT COUNT(*) FROM dbo.followers WHERE followee_id = u.user_id) AS followers,
                 (SELECT COUNT(*) FROM dbo.followers WHERE follower_id = u.user_id) AS following
          FROM dbo.users u
          WHERE u.user_id = @userId
        `);
      return result.recordset[0];
    } catch (error) {
      console.error('Error in getUserById:', error.message);
      throw error;
    }
  },

  async createUser(username, email, passwordHash, isFounder, isInvestor) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('username', sql.VarChar, username)
        .input('email', sql.VarChar, email)
        .input('passwordHash', sql.VarChar, passwordHash)
        .input('isFounder', sql.Bit, isFounder)
        .input('isInvestor', sql.Bit, isInvestor)
        .query(`
          INSERT INTO dbo.users (username, email, password_hash, is_founder, is_investor)
          VALUES (@username, @email, @passwordHash, @isFounder, @isInvestor);
          SELECT SCOPE_IDENTITY() AS user_id
        `);
      const newUserId = result.recordset[0].user_id;
      return await this.getUserById(newUserId); // Return full user object
    } catch (error) {
      console.error('Error in createUser:', error.message);
      throw error;
    }
  },

  async followUser(followerId, followeeId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      await request
        .input('followerId', sql.Int, followerId)
        .input('followeeId', sql.Int, followeeId)
        .query(`
          INSERT INTO dbo.followers (follower_id, followee_id, followed_at)
          VALUES (@followerId, @followeeId, GETDATE())
        `);
    } catch (error) {
      console.error('Error in followUser:', error.message);
      throw error;
    }
  },

  async unfollowUser(followerId, followeeId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      await request
        .input('followerId', sql.Int, followerId)
        .input('followeeId', sql.Int, followeeId)
        .query(`
          DELETE FROM dbo.followers
          WHERE follower_id = @followerId AND followee_id = @followeeId
        `);
    } catch (error) {
      console.error('Error in unfollowUser:', error.message);
      throw error;
    }
  },

  async isFollowing(followerId, followeeId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('followerId', sql.Int, followerId)
        .input('followeeId', sql.Int, followeeId)
        .query(`
          SELECT COUNT(*) AS count
          FROM dbo.followers
          WHERE follower_id = @followerId AND followee_id = @followeeId
        `);
      return result.recordset[0].count > 0;
    } catch (error) {
      console.error('Error in isFollowing:', error.message);
      throw error;
    }
  },

  async getFollowers(userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .query(`
          SELECT u.user_id, u.username, u.profile_picture
          FROM dbo.users u
          JOIN dbo.followers f ON u.user_id = f.follower_id
          WHERE f.followee_id = @userId
        `);
      return result.recordset;
    } catch (error) {
      console.error('Error in getFollowers:', error.message);
      throw error;
    }
  },

  async getFollowing(userId) {
    try {
      const pool = await connectDB();
      const request = pool.request();
      const result = await request
        .input('userId', sql.Int, userId)
        .query(`
          SELECT u.user_id, u.username, u.profile_picture
          FROM dbo.users u
          JOIN dbo.followers f ON u.user_id = f.followee_id
          WHERE f.follower_id = @userId
        `);
      return result.recordset;
    } catch (error) {
      console.error('Error in getFollowing:', error.message);
      throw error;
    }
  },
};

module.exports = User;