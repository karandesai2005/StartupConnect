const { queryDB } = require('../config/db');

// SQL query templates
const QUERIES = {
  GET_BY_EMAIL: 'SELECT * FROM public.users WHERE email = $1',
  GET_USER_DETAILS: `
    SELECT u.user_id, u.username, u.email, u.name, u.bio, u.profile_picture, 
           u.is_founder, u.is_investor, u.is_personal, u.is_business, u.reel_url, u.interests,
           (SELECT COUNT(*) FROM public.followers WHERE followee_id = u.user_id) AS followers,
           (SELECT COUNT(*) FROM public.followers WHERE follower_id = u.user_id) AS following
    FROM public.users u
    WHERE `,
  CREATE_USER: `
    INSERT INTO public.users (username, email, supabase_uid, is_founder, is_investor, created_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    RETURNING user_id`,
  FOLLOW: `
    INSERT INTO public.followers (follower_id, followee_id, followed_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP)`,
  UNFOLLOW: `
    DELETE FROM public.followers
    WHERE follower_id = $1 AND followee_id = $2`,
  IS_FOLLOWING: `
    SELECT COUNT(*) AS count
    FROM public.followers
    WHERE follower_id = $1 AND followee_id = $2`,
  GET_FOLLOWERS: `
    SELECT u.user_id, u.username, u.profile_picture
    FROM public.users u
    JOIN public.followers f ON u.user_id = f.follower_id
    WHERE f.followee_id = $1`,
  GET_FOLLOWING: `
    SELECT u.user_id, u.username, u.profile_picture
    FROM public.users u
    JOIN public.followers f ON u.user_id = f.followee_id
    WHERE f.follower_id = $1`,
  GET_BY_UUID: 'SELECT user_id FROM public.users WHERE supabase_uid = $1',
};

// Utility function to execute queries
async function executeQuery(query, params = []) {
  return await queryDB(query, params);
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
      const result = await executeQuery(QUERIES.GET_BY_EMAIL, [email]);
      return result[0] || null;
    }, 'getUserByEmail');
  },

  async getUserByUsername(username) {
    return withErrorHandling(async () => {
      const result = await executeQuery(`${QUERIES.GET_USER_DETAILS} u.username = $1`, [username]);
      return result[0] || null;
    }, 'getUserByUsername');
  },

  async getUserById(userId) {
    return withErrorHandling(async () => {
      const result = await executeQuery(`${QUERIES.GET_USER_DETAILS} u.user_id = $1`, [userId]);
      return result[0] || null;
    }, 'getUserById');
  },

  async getUserByUuid(uuid) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.GET_BY_UUID, [uuid]);
      return result[0] ? await this.getUserById(result[0].user_id) : null;
    }, 'getUserByUuid');
  },

  async createUser(username, email, supabase_uid, isFounder, isInvestor) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.CREATE_USER, [
        username,
        email,
        supabase_uid,
        isFounder ? 1 : 0,
        isInvestor ? 1 : 0,
      ]);
      const newUserId = result[0].user_id;
      return this.getUserById(newUserId);
    }, 'createUser');
  },

  async followUser(followerId, followeeId) {
    return withErrorHandling(async () => {
      await executeQuery(QUERIES.FOLLOW, [followerId, followeeId]);
    }, 'followUser');
  },

  async unfollowUser(followerId, followeeId) {
    return withErrorHandling(async () => {
      await executeQuery(QUERIES.UNFOLLOW, [followerId, followeeId]);
    }, 'unfollowUser');
  },

  async isFollowing(followerId, followeeId) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.IS_FOLLOWING, [followerId, followeeId]);
      return result[0].count > 0;
    }, 'isFollowing');
  },

  async getFollowers(userId) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.GET_FOLLOWERS, [userId]);
      return result;
    }, 'getFollowers');
  },

  async getFollowing(userId) {
    return withErrorHandling(async () => {
      const result = await executeQuery(QUERIES.GET_FOLLOWING, [userId]);
      return result;
    }, 'getFollowing');
  },
};

module.exports = User;