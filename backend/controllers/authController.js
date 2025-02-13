const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUserByEmail, createUser } = require("../models/userModel");
const { queryDB } = require("../config/db");


// Register user
const register = async (req, res) => {
  try {
    const { username, email, password, isFounder, isInvestor } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required." });
    }

    const normalizedEmail = email.toLowerCase();

    // Check for existing user
    const existingUsers = await queryDB(
      'SELECT * FROM users WHERE email = @param1',
      [normalizedEmail]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS, 10));

    // Insert new user
    const query = `
      INSERT INTO users (username, email, password_hash, is_founder, is_investor)
      VALUES (@param1, @param2, @param3, @param4, @param5);
      SELECT SCOPE_IDENTITY() AS user_id;
    `;
    
    const result = await queryDB(query, [
      username,
      normalizedEmail,
      passwordHash,
      isFounder ? 1 : 0,
      isInvestor ? 1 : 0
    ]);

    res.status(201).json({ 
      message: "User registered successfully", 
      user: { 
        user_id: result[0].user_id,
        username,
        email: normalizedEmail
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    let query, value;
    if (email) {
      const normalizedEmail = email.toLowerCase();
      query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
      value = normalizedEmail;
    } else if (username) {
      query = 'SELECT * FROM users WHERE LOWER(username) = LOWER($1)';
      value = username;
    } else {
      return res.status(400).json({ message: "Email or username is required." });
    }

    const user = await queryDB(query, [value]);

    if (user.length === 0) {
      return res.status(400).json({ message: "Invalid email/username or password" });
    }

    const isMatch = await bcrypt.compare(password, user[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email/username or password" });
    }

    const token = jwt.sign({ userId: user[0].user_id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Login successful", token });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Save user details step-by-step
// Save user details step-by-step
const saveUserDetails = async (req, res) => {
  console.log("Request Body:", req.body);

  try {
    const { step, data } = req.body;

    if (!step || !data) {
      return res.status(400).json({ message: "Step and data are required." });
    }

    let query, params;

    switch (step) {
      case 1:
        if (!data.email) {
          return res.status(400).json({ message: "Email is required." });
        }

        const normalizedEmail = data.email.toLowerCase();

        // Check if email exists
        const existingUsers = await queryDB(
          'SELECT * FROM users WHERE email = @param1',
          [normalizedEmail]
        );

        if (existingUsers.length > 0) {
          return res.status(400).json({ message: "Email already in use." });
        }

        const tempUsername = `user_${Date.now()}`;

        // Insert new user and get ID
        query = `
          INSERT INTO users (email, username, created_at)
          VALUES (@param1, @param2, GETDATE());
          SELECT SCOPE_IDENTITY() AS user_id;
        `;
        params = [normalizedEmail, tempUsername];
        break;

      case 2:
        if (!data.password) {
          return res.status(400).json({ message: "Password is required." });
        }

        if (!data.userId) {
          return res.status(400).json({ message: "User ID is required." });
        }

        const passwordHash = await bcrypt.hash(data.password, parseInt(process.env.SALT_ROUNDS, 10));

        query = `
          UPDATE users 
          SET password_hash = @param1 
          WHERE user_id = @param2;
          SELECT user_id FROM users WHERE user_id = @param2;
        `;
        params = [passwordHash, data.userId];
        break;

      case 3:
        if (!data.username || data.username.length < 3 || data.username.length > 20) {
          return res.status(400).json({
            message: "Username must be between 3 and 20 characters.",
          });
        }

        query = `
          UPDATE users 
          SET username = @param1 
          WHERE user_id = @param2;
          SELECT user_id FROM users WHERE user_id = @param2;
        `;
        params = [data.username, data.userId];
        break;

      case 4:
        if (data.preference !== "personal" && data.preference !== "business") {
          return res.status(400).json({ message: "Invalid preference." });
        }

        query = `
          UPDATE users 
          SET is_personal = @param1, is_business = @param2 
          WHERE user_id = @param3;
          SELECT user_id FROM users WHERE user_id = @param3;
        `;
        params = [
          data.preference === "personal" ? 1 : 0,
          data.preference === "business" ? 1 : 0,
          data.userId
        ];
        break;

      case 5:
        if (!data.realName || data.realName.trim() === "") {
          return res.status(400).json({ message: "Real name is required." });
        }

        query = `
          UPDATE users 
          SET name = @param1 
          WHERE user_id = @param2;
          SELECT user_id FROM users WHERE user_id = @param2;
        `;
        params = [data.realName.trim(), data.userId];
        break;

      default:
        return res.status(400).json({ message: "Invalid step." });
    }

    const result = await queryDB(query, params);
    res.status(200).json({ message: "Data saved successfully", result });

  } catch (err) {
    console.error("Error saving user details:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Validate username availability
const validateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    console.log("Validating username:", username); // Debug log

    // Validate length first
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        available: false,
        message: "Username must be between 3 and 20 characters",
      });
    }

    // Check if username exists using queryDB
    const existingUsers = await queryDB(
      'SELECT * FROM users WHERE username = @param1',
      [username]
    );
    
    console.log("Query result:", existingUsers); // Debug log

    if (existingUsers.length > 0) {
      return res.status(200).json({
        available: false,
        message: "Username already exists",
      });
    }

    res.status(200).json({
      available: true,
      message: "Username is available",
    });
  } catch (err) {
    console.error("Error validating username:", err);
    res.status(500).json({
      available: false,
      message: "Error validating username",
      error: err.message,
    });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Modified query to include bio and profile_picture
    const result = await pool.query(
      'SELECT user_id, username, email, name, bio, profile_picture, is_personal, is_business FROM users WHERE user_id = $1',
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

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bio } = req.body;
    const profilePicture = req.file;

    console.log("Received bio:", bio);
    console.log("Received file:", profilePicture); // 🔥 Check if Multer receives the file

    let updates = [];
    let values = [];

    if (bio) {
      updates.push(`bio = $${values.length + 1}`);
      values.push(bio);
    }

    if (profilePicture) {
      const profilePicturePath = `${req.protocol}://${req.get('host')}/uploads/profile_pictures/${profilePicture.filename}`;
      updates.push(`profile_picture = $${values.length + 1}`);
      values.push(profilePicturePath);
    }

    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE user_id = $${values.length} 
      RETURNING user_id, username, email, name, bio, profile_picture, is_personal, is_business
    `;

    const result = await pool.query(query, values);
    console.log("Updated user:", result.rows[0]); // 🔥 Check if the database update works

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};



module.exports = { register, login, validateUsername, saveUserDetails, getUserProfile,updateProfile };
