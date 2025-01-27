const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUserByEmail, createUser } = require("../models/userModel");
const pool = require("../config/db");

const register = async (req, res) => {
  try {
    const { username, email, password, isFounder, isInvestor } = req.body;

    // Normalize email to lowercase for consistent checks
    const normalizedEmail = email.toLowerCase();

    // Case-sensitive check for existing email
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 COLLATE "C"',
      [normalizedEmail]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS, 10));

    // Insert the new user into the database
    const user = await createUser(username, normalizedEmail, passwordHash, isFounder, isInvestor);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Normalize email to lowercase for consistent checks
    const normalizedEmail = email.toLowerCase();

    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 COLLATE "C"',
      [normalizedEmail]
    );
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.rows[0].user_id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const saveUserDetails = async (req, res) => {
  console.log("Request Body:", req.body);

  try {
    const { step, data } = req.body;

    if (!step || !data) {
      return res.status(400).json({ message: "Step and data are required." });
    }

    let query, values;
    switch (step) {
      // Step 1: Save email
      case 1:
        if (!data.email) {
          return res.status(400).json({ message: "Email is required." });
        }

        // Normalize email to lowercase
        const normalizedEmail = data.email.toLowerCase();

        // Check if the email already exists
        const existingUser = await pool.query(
          'SELECT * FROM users WHERE email = $1 COLLATE "C"',
          [normalizedEmail]
        );
        if (existingUser.rows.length > 0) {
          return res.status(400).json({ message: "Email already in use." });
        }

        // Generate a temporary username
        const tempUsername = `user_${Date.now()}`;

        query = `
        INSERT INTO users (email, username, created_at)
        VALUES ($1, $2, NOW())
        RETURNING user_id;
      `;
        values = [normalizedEmail, tempUsername];
        break;

      // Step 2: Save password
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

      // Step 3: Save username
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

      // Step 4: Save preference (Personal or Business)
      case 4:
        if (data.preference !== "personal" && data.preference !== "business") {
          return res.status(400).json({ message: "Invalid preference." });
        }

        query = `
        UPDATE users SET is_personal = $1, is_business = $2 WHERE user_id = $3;
      `;
        values = [data.preference === "personal", data.preference === "business", data.userId];
        break;

      // Step 5: Save real name (for Personal users)
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


const validateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    // Case-sensitive username check
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

module.exports = { register, login, validateUsername, saveUserDetails };
