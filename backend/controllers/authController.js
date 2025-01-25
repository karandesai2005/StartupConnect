const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUserByEmail, createUser } = require("../models/userModel");
const pool = require("../config/db");

const register = async (req, res) => {
  try {
    const { username, email, password, isFounder, isInvestor } = req.body;
    const existingUser = await getUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS, 10));
    const user = await createUser(username, email, passwordHash, isFounder, isInvestor);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Case-sensitive check for email and username during registration and validation
const saveUserDetails = async (req, res) => {
  console.log("Request Body:", req.body);

  try {
    const { step, data } = req.body;
    if (!step || !data) {
      return res.status(400).json({ message: "Step and data are required." });
    }

    let query, values;

    // Step 1: Insert new user with only email and username (no password yet)
    if (step === 1) {
      if (!data.email) {
        return res.status(400).json({ message: "Email is required." });
      }

      console.log("Saving email and username to the database:", data.email);

      // Case-sensitive email check
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1 COLLATE "C"', [data.email]);
      if (existingUser.rows.length > 0) {
        // Email is already taken, return error response
        return res.status(400).json({ message: "Email already in use" });
      }

      // Generate a temporary username (you may want to adjust this logic based on your requirements)
      const tempUsername = `user_${Date.now()}`;

      query = `
        INSERT INTO users (email, username, created_at)
        VALUES ($1, $2, NOW())
        RETURNING user_id;
      `;
      values = [data.email, tempUsername];
    } 
    // Step 2: Hash and update password after initial insert
    else if (step === 2) {
      if (!data.password || typeof data.password !== "string" || data.password.length < 8) {
        return res.status(400).json({ message: "Password is required and must be at least 8 characters long." });
      }
    
      const passwordHash = await bcrypt.hash(data.password, parseInt(process.env.SALT_ROUNDS, 10));
      console.log("Password hash generated:", passwordHash);
    
      query = `
        UPDATE users SET password_hash = $1 WHERE user_id = $2;
      `;
      values = [passwordHash, data.userId];
    }
    
    // Handle other steps (e.g., update bio, username)
    else {
      switch (step) {
        case 3:
          query = `UPDATE users SET username = $1 WHERE user_id = $2;`;
          values = [data.username, data.userId];
          break;
        case 4:
          query = `UPDATE users SET bio = $1 WHERE user_id = $2;`;
          values = [data.bio, data.userId];
          break;
        case 5:
          query = `UPDATE users SET is_founder = $1, is_investor = $2 WHERE user_id = $3;`;
          values = [data.isFounder, data.isInvestor, data.userId];
          break;
        default:
          return res.status(400).json({ message: "Invalid step." });
      }
    }

    const result = await pool.query(query, values);
    console.log("Query result:", result.rows);  // Log the result for debugging

    // Ensure the response is sent only once
    if (!res.headersSent) {
      res.status(200).json({ message: "Data saved successfully", result: result.rows });
    }
  } catch (err) {
    console.error("Error saving user details:", err.message);  // Log the error
    
    // Check if response has been sent, then avoid sending another
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error", error: err.message });
    }
  }
};

// Case-sensitive check for username
const validateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1 COLLATE "C"', [username]);
    if (result.rows.length > 0) return res.status(400).json({ message: "Username already exists" });
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: "Username must be between 3 and 20 characters" });
    }
    res.status(200).json({ message: "Username is available" });
  } catch (err) {
    res.status(500).json({ message: "Error validating username", error: err.message });
  }
};






// const validateUsername = async (req, res) => {
//   try {
//     const { username } = req.body;
//     const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
//     if (result.rows.length > 0) return res.status(400).json({ message: "Username already exists" });
//     if (username.length < 3 || username.length > 20) {
//       return res.status(400).json({ message: "Username must be between 3 and 20 characters" });
//     }
//     res.status(200).json({ message: "Username is available" });
//   } catch (err) {
//     res.status(500).json({ message: "Error validating username", error: err.message });
//   }
// };

module.exports = { register, login, validateUsername, saveUserDetails };
