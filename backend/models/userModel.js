  // backend/models/userModel.js
  const pool = require("../config/db");

  // Get user by email
  const getUserByEmail = async (email) => {
    const { rows } = await pool.query("SELECT * FROM dbo.users WHERE email = $1", [email]);
    return rows[0];
  };

  // Get user by username
  const getUserByUsername = async (username) => {
    const { rows } = await pool.query(
      `
      SELECT u.*, 
            (SELECT COUNT(*) FROM dbo.followers WHERE followee_id = u.user_id) AS followers,
            (SELECT COUNT(*) FROM dbo.followers WHERE follower_id = u.user_id) AS following
      FROM dbo.users u
      WHERE u.username = $1
      `,
      [username]
    );
    return rows[0];
  };

  // Get user by ID
  const getUserById = async (userId) => {
    const { rows } = await pool.query(
      `
      SELECT u.*, 
            (SELECT COUNT(*) FROM dbo.followers WHERE followee_id = u.user_id) AS followers,
            (SELECT COUNT(*) FROM dbo.followers WHERE follower_id = u.user_id) AS following
      FROM dbo.users u
      WHERE u.user_id = $1
      `,
      [userId]
    );
    return rows[0];
  };

  // Create new user
  const createUser = async (username, email, passwordHash, isFounder, isInvestor) => {
    const { rows } = await pool.query(
      `
      INSERT INTO dbo.users (username, email, password_hash, is_founder, is_investor)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [username, email, passwordHash, isFounder, isInvestor]
    );
    return rows[0];
  };

  // Follow a user
  const followUser = async (followerId, followeeId) => {
    await pool.query(
      `
      INSERT INTO dbo.followers (follower_id, followee_id, followed_at)
      VALUES ($1, $2, GETDATE())
      `,
      [followerId, followeeId]
    );
  };

  // Unfollow a user
  const unfollowUser = async (followerId, followeeId) => {
    await pool.query(
      `
      DELETE FROM dbo.followers
      WHERE follower_id = $1 AND followee_id = $2
      `,
      [followerId, followeeId]
    );
  };

  // Check if a user is following another user
  const isFollowing = async (followerId, followeeId) => {
    const { rows } = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM dbo.followers
      WHERE follower_id = $1 AND followee_id = $2
      `,
      [followerId, followeeId]
    );
    return rows[0].count > 0;
  };

  // Get followers of a user
  const getFollowers = async (userId) => {
    const { rows } = await pool.query(
      `
      SELECT u.user_id, u.username, u.profile_picture
      FROM dbo.users u
      JOIN dbo.followers f ON u.user_id = f.follower_id
      WHERE f.followee_id = $1
      `,
      [userId]
    );
    return rows;
  };

  // Get users a user is following
  const getFollowing = async (userId) => {
    const { rows } = await pool.query(
      `
      SELECT u.user_id, u.username, u.profile_picture
      FROM dbo.users u
      JOIN dbo.followers f ON u.user_id = f.followee_id
      WHERE f.follower_id = $1
      `,
      [userId]
    );
    return rows;
  };

  module.exports = {
    getUserByEmail,
    getUserByUsername,
    getUserById,
    createUser,
    followUser,
    unfollowUser,
    isFollowing,
    getFollowers,
    getFollowing,
  };