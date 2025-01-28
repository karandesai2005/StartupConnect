const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUserByEmail, createUser } = require("../models/userModel");
const pool = require("../config/db");

// Register user
const register = async (req, res) => {
  try {
    const { username, email, password, isFounder, isInvestor } = req.body;

    const normalizedEmail = email.toLowerCase();

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 COLLATE "C"',
      [normalizedEmail]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS, 10));

    const user = await createUser(username, normalizedEmail, passwordHash, isFounder, isInvestor);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    let normalizedEmail = null;
    let query = '';

    if (email) {
      normalizedEmail = email.toLowerCase();
      query = 'SELECT * FROM users WHERE email = $1 COLLATE "C"';
    } else if (username) {
      query = 'SELECT * FROM users WHERE username = $1 COLLATE "C"';
    } else {
      return res.status(400).json({ message: "Email or username is required" });
    }

    const user = await pool.query(query, [email || username]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email/username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email/username or password" });
    }

    const token = jwt.sign({ userId: user.rows[0].user_id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Save user details step-by-step
const saveUserDetails = async (req, res) => {
  console.log("Request Body:", req.body);

  try {
    const { step, data } = req.body;

    if (!step || !data) {
      return res.status(400).json({ message: "Step and data are required." });
    }

    let query, values;
    switch (step) {
      case 1:
        if (!data.email) {
          return res.status(400).json({ message: "Email is required." });
        }

        const normalizedEmail = data.email.toLowerCase();

        const existingUser = await pool.query(
          'SELECT * FROM users WHERE email = $1 COLLATE "C"',
          [normalizedEmail]
        );
        if (existingUser.rows.length > 0) {
          return res.status(400).json({ message: "Email already in use." });
        }

        const tempUsername = `user_${Date.now()}`;

        query = `
          INSERT INTO users (email, username, created_at)
          VALUES ($1, $2, NOW())
          RETURNING user_id;
        `;
        values = [normalizedEmail, tempUsername];
        break;

      case 2:
        if (!data.password) {
          return res.status(400).json({ message: "Password is required." });
        }

        const passwordHash = await bcrypt.hash(data.password, parseInt(process.env.SALT_ROUNDS, 10));

        query = `
          UPDATE users SET password_hash = $1 WHERE user_id = $2;
        `;
        values = [passwordHash, data.userId];
        break;

      case 3:
        if (!data.username || data.username.length < 3 || data.username.length > 20) {
          return res.status(400).json({
            message: "Username must be between 3 and 20 characters.",
          });
        }

        query = `
          UPDATE users SET username = $1 WHERE user_id = $2;
        `;
        values = [data.username, data.userId];
        break;

      case 4:
        if (data.preference !== "personal" && data.preference !== "business") {
          return res.status(400).json({ message: "Invalid preference." });
        }

        query = `
          UPDATE users SET is_personal = $1, is_business = $2 WHERE user_id = $3;
        `;
        values = [data.preference === "personal", data.preference === "business", data.userId];
        break;

      case 5:
        if (!data.realName || data.realName.trim() === "") {
          return res.status(400).json({ message: "Real name is required." });
        }

        query = `
          UPDATE users SET name = $1 WHERE user_id = $2;
        `;
        values = [data.realName.trim(), data.userId];
        break;

      default:
        return res.status(400).json({ message: "Invalid step." });
    }

    const result = await pool.query(query, values);
    res.status(200).json({ message: "Data saved successfully", result: result.rows });
  } catch (err) {
    console.error("Error saving user details:", err.message);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Validate username availability
const validateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 COLLATE "C"',
      [username]
    );
    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        message: "Username must be between 3 and 20 characters",
      });
    }

    res.status(200).json({ message: "Username is available" });
  } catch (err) {
    res.status(500).json({ message: "Error validating username", error: err.message });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Extract user ID from JWT payload

    const result = await pool.query(
      'SELECT user_id, username, email, name, is_personal, is_business FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err.message);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

module.exports = { register, login, validateUsername, saveUserDetails, getUserProfile };
