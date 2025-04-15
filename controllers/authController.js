const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUserByEmail, createUser } = require("../models/userModel");
const { queryDB } = require("../config/db");
const { uploadAndConvertPostMedia } = require("../config/multerConfig"); // Import the correct middleware

// Register user
const register = async (req, res) => {
  try {
    const { username, email, password, isFounder, isInvestor } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required." });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUsers = await queryDB(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS, 10));

    const query = `
      INSERT INTO users (username, email, password_hash, is_founder, is_investor)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id;
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
    console.error("Registration error:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log("Login attempt with:", { email, username });

    if (!email && !username) {
      return res.status(400).json({ message: "Email or username is required." });
    }

    let query = email ? "SELECT * FROM users WHERE email = $1" : "SELECT * FROM users WHERE username = $1";
    let paramValue = (email || username).toLowerCase();

    const users = await queryDB(query, [paramValue]);
    console.log("Query result:", users);

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid email/username or password" });
    }

    const user = users[0];
    console.log("Found user:", { userId: user.user_id });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email/username or password" });
    }

    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log("Generated token:", token);

    res.status(200).json({ message: "Login successful!", token });
  } catch (err) {
    console.error("Login error:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token from "Bearer <token>"
    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }

    // Decode the token to get its expiration time
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expiresAt = new Date(decoded.exp * 1000); // Convert expiration time to Date object

    // Add the token to the blacklist
    const query = `
      INSERT INTO token_blacklist (token, expires_at)
      VALUES ($1, $2)
    `;
    await queryDB(query, [token, expiresAt]);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Middleware to check if token is blacklisted
const checkTokenBlacklist = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Check if token is in the blacklist
    const query = `
      SELECT * FROM token_blacklist WHERE token = $1
    `;
    const result = await queryDB(query, [token]);

    if (result.length > 0) {
      return res.status(401).json({ message: "Token has been invalidated" });
    }

    next();
  } catch (err) {
    console.error("Token blacklist check error:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Delete user account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const token = req.headers.authorization?.split(" ")[1]; // Extract token for blacklisting

    // Begin transaction to ensure data integrity
    const transactionQueries = [
      // Delete user's comments
      {
        query: `
          DELETE FROM comments WHERE user_id = $1
        `,
        params: [userId]
      },
      // Delete user's likes
      {
        query: `
          DELETE FROM likes WHERE user_id = $1
        `,
        params: [userId]
      },
      // Delete user's posts
      {
        query: `
          DELETE FROM posts WHERE user_id = $1
        `,
        params: [userId]
      },
      // Delete user
      {
        query: `
          DELETE FROM users WHERE user_id = $1
        `,
        params: [userId]
      }
    ];

    // Execute all delete queries in a transaction
    for (const { query, params } of transactionQueries) {
      await queryDB(query, params);
    }

    // Blacklist the token
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const expiresAt = new Date(decoded.exp * 1000);
      const blacklistQuery = `
        INSERT INTO token_blacklist (token, expires_at)
        VALUES ($1, $2)
      `;
      await queryDB(blacklistQuery, [token, expiresAt]);
    }

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err.stack);
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

    let query, params;

    switch (step) {
      case 1:
        // Existing email step
        if (!data.email) {
          return res.status(400).json({ message: "Email is required." });
        }
        const normalizedEmail = data.email.toLowerCase();
        const existingUsers = await queryDB('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        if (existingUsers.length > 0) {
          return res.status(400).json({ message: "Email already in use." });
        }
        const tempUsername = `user_${Date.now()}`;
        query = `
          INSERT INTO users (email, username, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          RETURNING user_id;
        `;
        params = [normalizedEmail, tempUsername];
        break;

      case 2:
        // Existing password step
        if (!data.password || !data.userId) {
          return res.status(400).json({ message: "Password and userId are required." });
        }
        const passwordHash = await bcrypt.hash(data.password, parseInt(process.env.SALT_ROUNDS, 10));
        query = `
          UPDATE users 
          SET password_hash = $1 
          WHERE user_id = $2
          RETURNING user_id;
        `;
        params = [passwordHash, data.userId];
        break;

      case 3:
        // Existing username step
        if (!data.username || data.username.length < 3 || data.username.length > 20) {
          return res.status(400).json({ message: "Username must be between 3 and 20 characters." });
        }
        query = `
          UPDATE users 
          SET username = $1 
          WHERE user_id = $2
          RETURNING user_id;
        `;
        params = [data.username, data.userId];
        break;

      case 4:
        // Existing preference step
        if (data.preference !== "personal" && data.preference !== "business") {
          return res.status(400).json({ message: "Invalid preference." });
        }
        query = `
          UPDATE users 
          SET is_personal = $1, is_business = $2 
          WHERE user_id = $3
          RETURNING user_id;
        `;
        params = [data.preference === "personal" ? 1 : 0, data.preference === "business" ? 1 : 0, data.userId];
        break;

      case 5:
        if (!data.realName || data.realName.trim() === "") {
          return res.status(400).json({ message: "Real name is required." });
        }
        query = `
          UPDATE users 
          SET name = $1 
          WHERE user_id = $2
          RETURNING user_id;
        `;
        params = [data.realName.trim(), data.userId];
        break;

      case 6: // New step for interests and completing registration
        if (!data.interests || !Array.isArray(data.interests) || data.interests.length < 3) {
          return res.status(400).json({ message: "At least 3 interests are required." });
        }
        if (!data.userId) {
          return res.status(400).json({ message: "User ID is required." });
        }

        // Save interests (assuming you have an interests table or column)
        // For simplicity, let's assume a JSON column 'interests' in the users table
        query = `
          UPDATE users 
          SET interests = $1 
          WHERE user_id = $2
          RETURNING user_id, email, username;
        `;
        params = [JSON.stringify(data.interests), data.userId];

        const result = await queryDB(query, params);
        const user = result[0];

        // Generate JWT token
        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        return res.status(200).json({
          message: "Registration completed successfully",
          user: { user_id: user.user_id, email: user.email, username: user.username },
          token,
        });

      default:
        return res.status(400).json({ message: "Invalid step." });
    }

    const result = await queryDB(query, params);
    res.status(200).json({ message: "Data saved successfully", result });
  } catch (err) {
    console.error("Error saving user details:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Validate username availability
const validateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    console.log("Validating username:", username);

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        available: false,
        message: "Username must be between 3 and 20 characters",
      });
    }

    const existingUsers = await queryDB(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    console.log("Query result:", existingUsers);

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
    console.error("Error validating username:", err.stack);
    res.status(500).json({
      available: false,
      message: "Error validating username",
      error: err.message,
    });
  }
};

// Get current user's profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT user_id, username, email, name, bio, profile_picture, is_personal, is_business, reel_url 
      FROM users 
      WHERE user_id = $1
    `;

    const result = await queryDB(query, [userId]);

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(result[0]);
  } catch (err) {
    console.error("Error fetching user profile:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Update current user's profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bio } = req.body;
    const profilePicture = req.file;

    console.log("Received bio:", bio);
    console.log("Received file:", profilePicture);

    let updates = [];
    let values = [];

    if (bio) {
      updates.push("bio = $1");
      values.push(bio);
    }

    if (profilePicture) {
      // Always use HTTPS for the URL
      const profilePicturePath = `https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net/uploads/profile_pictures/${profilePicture.filename}`;
      updates.push("profile_picture = $2");
      values.push(profilePicturePath);
    }

    values.push(userId);

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    const query = `
      UPDATE users 
      SET ${updates.join(", ")}
      WHERE user_id = $${values.length}
      RETURNING user_id, username, email, name, bio, profile_picture, is_personal, is_business;
    `;

    const result = await queryDB(query, values);
    console.log("Updated user:", result[0]);

    return res.status(200).json(result[0]);
  } catch (err) {
    console.error("Update error:", err.stack);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Fix profile picture URLs
const fixProfilePictureURLs = async (req, res) => {
  try {
    const query = `
      UPDATE users
      SET profile_picture = REPLACE(profile_picture, 'http://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net', 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net')
      WHERE profile_picture LIKE 'http://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net%';
    `;
    await queryDB(query, []);
    res.status(200).json({ message: "Profile picture URLs updated to HTTPS" });
  } catch (err) {
    console.error("Error updating profile picture URLs:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Get user profile by username
const getUserProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const query = `
      SELECT user_id, username, email, name, bio, profile_picture, is_personal, is_business 
      FROM users 
      WHERE username = $1
    `;

    const result = await queryDB(query, [username]);

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(result[0]);
  } catch (err) {
    console.error("Error fetching user profile by username:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Get user posts by username
const getUserPostsByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    // First, get the user_id from the username
    const userQuery = `
      SELECT user_id 
      FROM users 
      WHERE username = $1
    `;
    const userResult = await queryDB(userQuery, [username]);

    if (userResult.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = userResult[0].user_id;

    // Then, fetch posts for that user_id
    const postsQuery = `
      SELECT p.post_id, p.user_id, u.username, p.media_url, p.content, p.created_at, p.media_type,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) AS like_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `;
    const posts = await queryDB(postsQuery, [userId]);

    res.status(200).json(posts);
  } catch (err) {
    console.error("Error fetching user posts by username:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query; // Query parameter 'q' for search term
    if (!q || q.length < 1) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const query = `
      SELECT user_id, username, profile_picture
      FROM users
      WHERE username LIKE $1
      ORDER BY username
    `;
    const searchTerm = `%${q.toLowerCase()}%`;
    const result = await queryDB(query, [searchTerm]);

    res.status(200).json(result);
  } catch (err) {
    console.error("Error searching users:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  deleteAccount,
  validateUsername,
  saveUserDetails,
  getUserProfile, // Added
  updateProfile,
  getUserProfileByUsername,
  getUserPostsByUsername,
  searchUsers,
  checkTokenBlacklist,
  fixProfilePictureURLs
};