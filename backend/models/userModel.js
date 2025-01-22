const pool = require("../config/db");

// Get user by email
const getUserByEmail = async (email) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0];
};

// Create new user
const createUser = async (username, email, passwordHash, isFounder, isInvestor) => {
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password_hash, is_founder, is_investor)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [username, email, passwordHash, isFounder, isInvestor]
  );
  return rows[0];
};

module.exports = { getUserByEmail, createUser };

