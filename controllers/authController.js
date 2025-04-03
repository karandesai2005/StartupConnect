const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { queryDB } = require('../config/db');
const { uploadProfilePicture } = require('../config/multerConfig');

// Constants
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Fallback for dev
const TOKEN_EXPIRY = '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRY = '7d'; // Longer-lived refresh tokens
const BASE_URL = process.env.BASE_URL || 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net';

// Utility Functions
const normalizeInput = (value) => value.toLowerCase().trim();

const validateInput = (field, value, minLength, maxLength, regex) => {
  if (!value || value.length < minLength || value.length > maxLength || (regex && !regex.test(value))) {
    throw new Error(`${field} must be ${minLength}-${maxLength} characters and match format`);
  }
};

const generateToken = (userId, expiresIn = TOKEN_EXPIRY) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn });

const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

// Register user
const register = async (req, res) => {
  try {
    const { username, email, password, isFounder, isInvestor } = req.body;

    validateInput('Username', username, 3, 20, /^[a-zA-Z0-9_]+$/);
    validateInput('Email', email, 5, 255, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    validateInput('Password', password, 8, 128);

    const normalizedEmail = normalizeInput(email);
    const existingUsers = await queryDB('SELECT user_id FROM users WHERE email = @param1', [normalizedEmail]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const query = `
      INSERT INTO users (username, email, password_hash, is_founder, is_investor)
      OUTPUT INSERTED.user_id, INSERTED.username, INSERTED.email
      VALUES (@param1, @param2, @param3, @param4, @param5);
    `;
    const result = await queryDB(query, [username, normalizedEmail, passwordHash, !!isFounder, !!isInvestor]);

    const user = result[0];
    const token = generateToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    res.status(201).json({
      message: 'User registered successfully',
      user: { user_id: user.user_id, username, email: normalizedEmail },
      token,
      refreshToken,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(err.message.includes('must be') ? 400 : 500).json({ message: err.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email && !username) {
      return res.status(400).json({ message: 'Email or username required' });
    }

    const paramValue = normalizeInput(email || username);
    const query = email
      ? 'SELECT user_id, username, email, password_hash FROM users WHERE email = @param1'
      : 'SELECT user_id, username, email, password_hash FROM users WHERE username = @param1';
    const users = await queryDB(query, [paramValue]);

    if (!users.length) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    if (!(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    res.status(200).json({ message: 'Login successful', token, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    await queryDB('INSERT INTO token_blacklist (token, expires_at) VALUES (@param1, @param2)', [
      token,
      new Date(decoded.exp * 1000),
    ]);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(err.name === 'JsonWebTokenError' ? 401 : 500).json({ message: 'Invalid token or server error' });
  }
};

// Check token blacklist
const checkTokenBlacklist = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const result = await queryDB('SELECT token FROM token_blacklist WHERE token = @param1', [token]);
    if (result.length > 0) {
      return res.status(401).json({ message: 'Token invalidated' });
    }

    next();
  } catch (err) {
    console.error('Blacklist check error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete user account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const token = req.headers.authorization?.split(' ')[1];

    const queries = [
      'DELETE FROM comments WHERE user_id = @param1',
      'DELETE FROM likes WHERE user_id = @param1',
      'DELETE FROM posts WHERE user_id = @param1',
      'DELETE FROM users WHERE user_id = @param1',
    ];

    await queryDB('BEGIN TRANSACTION');
    for (const query of queries) {
      await queryDB(query, [userId]);
    }
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      await queryDB('INSERT INTO token_blacklist (token, expires_at) VALUES (@param1, @param2)', [
        token,
        new Date(decoded.exp * 1000),
      ]);
    }
    await queryDB('COMMIT TRANSACTION');

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    await queryDB('ROLLBACK TRANSACTION').catch(() => {});
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Save user details step-by-step
const saveUserDetails = async (req, res) => {
  try {
    const { step, data } = req.body;
    if (!step || !data) {
      return res.status(400).json({ message: 'Step and data required' });
    }

    let query, params;
    switch (step) {
      case 1:
        validateInput('Email', data.email, 5, 255, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        const normalizedEmail = normalizeInput(data.email);
        if ((await queryDB('SELECT user_id FROM users WHERE email = @param1', [normalizedEmail])).length > 0) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        query = 'INSERT INTO users (email, username, created_at) OUTPUT INSERTED.user_id VALUES (@param1, @param2, GETDATE())';
        params = [normalizedEmail, `user_${Date.now()}`];
        break;

      case 2:
        if (!data.userId || !data.password) {
          return res.status(400).json({ message: 'User ID and password required' });
        }
        validateInput('Password', data.password, 8, 128);
        query = 'UPDATE users SET password_hash = @param1 WHERE user_id = @param2 OUTPUT INSERTED.user_id';
        params = [await bcrypt.hash(data.password, SALT_ROUNDS), data.userId];
        break;

      case 3:
        if (!data.userId || !data.username) {
          return res.status(400).json({ message: 'User ID and username required' });
        }
        validateInput('Username', data.username, 3, 20, /^[a-zA-Z0-9_]+$/);
        query = 'UPDATE users SET username = @param1 WHERE user_id = @param2 OUTPUT INSERTED.user_id';
        params = [data.username, data.userId];
        break;

      case 4:
        if (!data.userId || !['personal', 'business'].includes(data.preference)) {
          return res.status(400).json({ message: 'User ID and valid preference required' });
        }
        query = 'UPDATE users SET is_personal = @param1, is_business = @param2 WHERE user_id = @param3 OUTPUT INSERTED.user_id';
        params = [data.preference === 'personal' ? 1 : 0, data.preference === 'business' ? 1 : 0, data.userId];
        break;

      case 5:
        if (!data.userId || !data.realName?.trim()) {
          return res.status(400).json({ message: 'User ID and real name required' });
        }
        query = 'UPDATE users SET name = @param1 WHERE user_id = @param2 OUTPUT INSERTED.user_id';
        params = [data.realName.trim(), data.userId];
        break;

      case 6:
        if (!data.userId || !Array.isArray(data.interests) || data.interests.length < 3) {
          return res.status(400).json({ message: 'User ID and at least 3 interests required' });
        }
        query = `
          UPDATE users SET interests = @param1 
          WHERE user_id = @param2 
          OUTPUT INSERTED.user_id, INSERTED.email, INSERTED.username
        `;
        params = [JSON.stringify(data.interests), data.userId];
        const result = await queryDB(query, params);
        const user = result[0];
        const token = generateToken(user.user_id);
        return res.status(200).json({
          message: 'Registration completed',
          user: { user_id: user.user_id, email: user.email, username: user.username },
          token,
        });

      default:
        return res.status(400).json({ message: 'Invalid step' });
    }

    const result = await queryDB(query, params);
    res.status(200).json({ message: 'Data saved', userId: result[0].user_id });
  } catch (err) {
    console.error('Save details error:', err);
    res.status(err.message.includes('must be') ? 400 : 500).json({ message: err.message });
  }
};

// Validate username availability
const validateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    validateInput('Username', username, 3, 20, /^[a-zA-Z0-9_]+$/);

    const exists = await queryDB('SELECT user_id FROM users WHERE username = @param1', [username]);
    res.status(200).json({
      available: exists.length === 0,
      message: exists.length > 0 ? 'Username taken' : 'Username available',
    });
  } catch (err) {
    console.error('Validate username error:', err);
    res.status(err.message.includes('must be') ? 400 : 500).json({ message: err.message });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const query = `
      SELECT user_id, username, email, name, bio, profile_picture, is_personal, is_business, reel_url
      FROM users WHERE user_id = @param1
    `;
    const result = await queryDB(query, [userId]);

    if (!result.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(result[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update profile with multer middleware
const updateProfile = [
  uploadProfilePicture.single('profilePicture'),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const { bio } = req.body;
      const profilePicture = req.file;

      const updates = [];
      const values = [];
      if (bio) {
        updates.push('bio = @param1');
        values.push(bio);
      }
      if (profilePicture) {
        const profilePicturePath = `${BASE_URL}/uploads/profile_pictures/${profilePicture.filename}`;
        updates.push('profile_picture = @param2');
        values.push(profilePicturePath);
      }
      if (!updates.length) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      values.push(userId);
      const query = `
        UPDATE users SET ${updates.join(', ')}
        OUTPUT INSERTED.user_id, INSERTED.username, INSERTED.email, INSERTED.name, INSERTED.bio, INSERTED.profile_picture, INSERTED.is_personal, INSERTED.is_business
        WHERE user_id = @param${values.length}
      `;
      const result = await queryDB(query, values);

      res.status(200).json(result[0]);
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
];

// Fix profile picture URLs
const fixProfilePictureURLs = async (req, res) => {
  try {
    const query = `
      UPDATE users
      SET profile_picture = REPLACE(profile_picture, 'http://', 'https://')
      WHERE profile_picture LIKE 'http://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net%'
    `;
    await queryDB(query, []);
    res.status(200).json({ message: 'Profile picture URLs updated to HTTPS' });
  } catch (err) {
    console.error('Fix URLs error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user profile by username
const getUserProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const query = `
      SELECT user_id, username, email, name, bio, profile_picture, is_personal, is_business
      FROM users WHERE username = @param1
    `;
    const result = await queryDB(query, [username]);

    if (!result.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(result[0]);
  } catch (err) {
    console.error('Get profile by username error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user posts by username
const getUserPostsByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const userResult = await queryDB('SELECT user_id FROM users WHERE username = @param1', [username]);
    if (!userResult.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = userResult[0].user_id;
    const postsQuery = `
      SELECT p.post_id, p.user_id, u.username, p.media_url, p.content, p.created_at, p.media_type,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) AS like_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.user_id = @param1
      ORDER BY p.created_at DESC
    `;
    const posts = await queryDB(postsQuery, [userId]);

    res.status(200).json(posts);
  } catch (err) {
    console.error('Get posts by username error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const query = `
      SELECT user_id, username, profile_picture
      FROM users
      WHERE username LIKE @param1
      ORDER BY username
    `;
    const result = await queryDB(query, [`%${normalizeInput(q)}%`]);

    res.status(200).json(result);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Exports
module.exports = {
  register,
  login,
  logout,
  deleteAccount,
  validateUsername,
  saveUserDetails,
  getUserProfile,
  updateProfile,
  getUserProfileByUsername,
  getUserPostsByUsername,
  searchUsers,
  checkTokenBlacklist,
  fixProfilePictureURLs,
};