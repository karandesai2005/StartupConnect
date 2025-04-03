const sql = require('mssql');
const { connectDB } = require('../config/db');

// SQL query templates
const QUERIES = {
  GET_BY_EMAIL: 'SELECT * FROM dbo.users WHERE email = @email',
  GET_USER_DETAILS: `
    SELECT u.*, 
           (SELECT COUNT(*) FROM dbo.followers WHERE followee_id = u.user_id) AS followers,
           (SELECT COUNT(*) FROM dbo.followers WHERE follower_id = u.user_id) AS following
    FROM dbo.users u
    WHERE `,
  CREATE_USER: `
    INSERT INTO dbo.users (username, email, password_hash, is_founder, is_investor)
    VALUES (@username, @email, @passwordHash, @isFounder, @isInvestor);
    SELECT SCOPE_IDENTITY() AS user_id`,
  FOLLOW: `
    INSERT INTO dbo.followers (follower_id, followee_id, followed_at)
    VALUES (@followerId, @followeeId, GETDATE())`,
  UNFOLLOW: `
    DELETE FROM dbo.followers
    WHERE follower_id = @followerId AND followee_id = @followeeId`,
  IS_FOLLOWING: `
    SELECT COUNT(*) AS count
    FROM dbo.followers
    WHERE follower_id = @followerId AND followee_id = @followeeId`,
  GET_FOLLOWERS: `
    SELECT u.user_id, u.username, u.profile_picture
    FROM dbo.users u
    JOIN dbo.followers f ON u.user_id = f.follower_id
    WHERE f.followee_id = @userId`,
  GET_FOLLOWING: `
    SELECT u.user_id, u.username, u.profile_picture
    FROM dbo.users u
    JOIN dbo.followers f ON u.user_id = f.followee_id
    WHERE f.follower_id = @userId`
};

// Utility function to execute queries
async function executeQuery(query, inputs = {}) {
  const pool = await connectDB();
  const request = pool.request();
  
  for (const [name, { type, value }] of Object.entries(inputs)) {
    request.input(name, type, value);
  }
  
  const result = await request.query(query);
  return result;
}

// Error handling wrapper
async function withErrorHandling(fn, operationName) {
  try {
    return await fn();
  } catch (error) {
    console.error(`Error in ${operationName}:`, error.message);
    throw error;
  }
}

const User = {
  async getUserByEmail(email) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.GET_BY_EMAIL, {
        email: { type: sql.VarChar, value: email }
      });
      return result.recordset[0];
    }, 'getUserByEmail');
  },

  async getUserByUsername(username) {
    return withErrorHandling(async () => {
      const result = await executeQuery(`${QUERIES.GET_USER_DETAILS} u.username = @username`, {
        username: { type: sql.VarChar, value: username }
      });
      return result.recordset[0];
    }, 'getUserByUsername');
  },

  async getUserById(userId) {
    return withErrorHandling(async () => {
      const result = await executeQuery(`${QUERIES.GET_USER_DETAILS} u.user_id = @userId`, {
        userId: { type: sql.Int, value: userId }
      });
      return result.recordset[0];
    }, 'getUserById');
  },

  async createUser(username, email, passwordHash, isFounder, isInvestor) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.CREATE_USER, {
        username: { type: sql.VarChar, value: username },
        email: { type: sql.VarChar, value: email },
        passwordHash: { type: sql.VarChar, value: passwordHash },
        isFounder: { type: sql.Bit, value: isFounder },
        isInvestor: { type: sql.Bit, value: isInvestor }
      });
      const newUserId = result.recordset[0].user_id;
      return this.getUserById(newUserId);
    }, 'createUser');
  },

  async followUser(followerId, followeeId) {
    return withErrorHandling(async () => {
      await executeQuery(QUERIES.FOLLOW, {
        followerId: { type: sql.Int, value: followerId },
        followeeId: { type: sql.Int, value: followeeId }
      });
    }, 'followUser');
  },

  async unfollowUser(followerId, followeeId) {
    return withErrorHandling(async () => {
      await executeQuery(QUERIES.UNFOLLOW, {
        followerId: { type: sql.Int, value: followerId },
        followeeId: { type: sql.Int, value: followeeId }
      });
    }, 'unfollowUser');
  },

  async isFollowing(followerId, followeeId) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.IS_FOLLOWING, {
        followerId: { type: sql.Int, value: followerId },
        followeeId: { type: sql.Int, value: followeeId }
      });
      return result.recordset[0].count > 0;
    }, 'isFollowing');
  },

  async getFollowers(userId) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.GET_FOLLOWERS, {
        userId: { type: sql.Int, value: userId }
      });
      return result.recordset;
    }, 'getFollowers');
  },

  async getFollowing(userId) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.GET_FOLLOWING, {
        userId: { type: sql.Int, value: userId }
      });
      return result.recordset;
    }, 'getFollowing');
  },
};

module.exports = User;