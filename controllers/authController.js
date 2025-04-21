const { supabase } = require('../services/supabase');
const { queryDB } = require('../config/db');
const { uploadAndConvertPostMedia } = require('../config/multerConfig');

// Password validation function
const validatePassword = (password) => {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return (
    password.length >= minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar
  );
};

// Register user (creates users table entry after Supabase auth)
const register = async (req, res) => {
  try {
    const { username, email, supabase_uid, isFounder, isInvestor } = req.body;

    if (!username || !email || !supabase_uid) {
      return res.status(400).json({ message: "Username, email, and supabase_uid are required." });
    }

    const normalizedEmail = email.toLowerCase();

    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', normalizedEmail);
    if (checkError) throw checkError;
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const { data: maxId } = await supabase
      .from('users')
      .select('user_id')
      .order('user_id', { ascending: false })
      .limit(1)
      .single();
    const newUserId = maxId ? maxId.user_id + 1 : 1;

    const { data, error } = await supabase
      .from('users')
      .insert({
        user_id: newUserId,
        username,
        email: normalizedEmail,
        supabase_uid,
        is_founder: isFounder ? 1 : 0,
        is_investor: isInvestor ? 1 : 0,
        created_at: new Date().toISOString(),
      })
      .select('user_id')
      .single();
    if (error) throw error;

    res.status(201).json({
      message: "User registered successfully",
      user: { user_id: data.user_id, username, email: normalizedEmail },
    });
  } catch (err) {
    console.error("Registration error:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Login user (handled by frontend)
const login = async (req, res) => {
  try {
    res.status(200).json({ message: "Login handled by Supabase client-side. Use /profile to verify." });
  } catch (err) {
    console.error("Login error:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Logout user (handled by frontend)
const logout = async (req, res) => {
  try {
    res.status(200).json({ message: "Logout handled by Supabase client-side" });
  } catch (err) {
    console.error("Logout error:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Delete user account
const deleteAccount = async (req, res) => {
  try {
    const supabase_uid = req.user.id;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('supabase_uid', supabase_uid)
      .single();
    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    const transactionQueries = [
      { query: `DELETE FROM comments WHERE user_id = $1`, params: [user.user_id] },
      { query: `DELETE FROM likes WHERE user_id = $1`, params: [user.user_id] },
      { query: `DELETE FROM posts WHERE user_id = $1`, params: [user.user_id] },
      { query: `DELETE FROM users WHERE user_id = $1`, params: [user.user_id] },
    ];

    for (const { query, params } of transactionQueries) {
      await queryDB(query, params);
    }

    // Optionally delete from auth.users (requires admin privileges)
    const { error: authError } = await supabase.auth.admin.deleteUser(supabase_uid);
    if (authError) console.warn('Failed to delete auth user:', authError.message);

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

    if (!step || !data || !data.supabase_uid) {
      return res.status(400).json({ message: "Step, data, and supabase_uid are required." });
    }

    switch (step) {
      case 1:
        // Email (handled by Supabase auth)
        return res.status(200).json({ message: "Email handled by Supabase auth" });

      case 2:
        // Password update
        console.log("Attempting password update for user:", data.supabase_uid);
        if (!data.password || !validatePassword(data.password)) {
          console.log("Password validation failed:", data.password);
          return res.status(400).json({
            message: "Password must be 8+ characters with uppercase, lowercase, number, and special character.",
          });
        }
        const { error: authError } = await supabase.auth.admin.updateUserById(data.supabase_uid, {
          password: data.password,
        });
        if (authError) {
          console.error("Supabase auth error:", authError.message);
          throw new Error(`Failed to update password: ${authError.message}`);
        }
        console.log("Password updated successfully for user:", data.supabase_uid);
        return res.status(200).json({ message: "Password updated successfully" });

      case 3:
        // Username
        if (!data.username || data.username.length < 3 || data.username.length > 20) {
          return res.status(400).json({ message: "Username must be between 3 and 20 characters." });
        }
        const { error: usernameError } = await supabase
          .from('users')
          .update({ username: data.username })
          .eq('supabase_uid', data.supabase_uid)
          .select('user_id')
          .single();
        if (usernameError) throw usernameError;
        break;

      case 4:
        // Preference
        if (data.preference !== "personal" && data.preference !== "business") {
          return res.status(400).json({ message: "Invalid preference." });
        }
        const { error: prefError } = await supabase
          .from('users')
          .update({
            is_personal: data.preference === "personal" ? 1 : 0,
            is_business: data.preference === "business" ? 1 : 0,
          })
          .eq('supabase_uid', data.supabase_uid)
          .select('user_id')
          .single();
        if (prefError) throw prefError;
        break;

      case 5:
        if (!data.realName || data.realName.trim() === "") {
          return res.status(400).json({ message: "Real name is required." });
        }
        const { error: nameError } = await supabase
          .from('users')
          .update({ name: data.realName.trim() })
          .eq('supabase_uid', data.supabase_uid)
          .select('user_id')
          .single();
        if (nameError) throw nameError;
        break;

      case 6:
        if (!data.interests || !Array.isArray(data.interests) || data.interests.length < 3) {
          return res.status(400).json({ message: "At least 3 interests are required." });
        }
        const { data: userData, error: interestsError } = await supabase
          .from('users')
          .update({ interests: data.interests })
          .eq('supabase_uid', data.supabase_uid)
          .select('user_id, email, username')
          .single();
        if (interestsError) throw interestsError;
        return res.status(200).json({
          message: "Registration completed successfully",
          user: { user_id: userData.user_id, email: userData.email, username: userData.username },
        });

      default:
        return res.status(400).json({ message: "Invalid step." });
    }

    res.status(200).json({ message: "Data saved successfully" });
  } catch (err) {
    console.error("Error saving user details:", err.message, err.stack);
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

    const { data: existingUsers, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username);
    if (error) throw error;

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
    const supabase_uid = req.user.id;

    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, email, name, bio, profile_picture, is_personal, is_business, reel_url')
      .eq('supabase_uid', supabase_uid)
      .single();
    if (error || !data) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching user profile:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Update current user's profile
const updateProfile = async (req, res) => {
  try {
    const supabase_uid = req.user.id;
    const { bio } = req.body;
    const profilePicture = req.file;

    console.log("Received bio:", bio);
    console.log("Received file:", profilePicture);

    let updates = {};
    if (bio) updates.bio = bio;
    if (profilePicture) {
      updates.profile_picture = `https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net/uploads/profile_pictures/${profilePicture.filename}`;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('supabase_uid', supabase_uid)
      .select('user_id, username, email, name, bio, profile_picture, is_personal, is_business')
      .single();
    if (error) throw error;

    console.log("Updated user:", data);
    res.status(200).json(data);
  } catch (err) {
    console.error("Update error:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Fix profile picture URLs (optional, may not be needed with Supabase)
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

    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, email, name, bio, profile_picture, is_personal, is_business')
      .eq('username', username)
      .single();
    if (error || !data) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching user profile by username:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Get user posts by username
const getUserPostsByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', username)
      .single();
    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    const postsQuery = `
      SELECT p.post_id, p.user_id, u.username, p.media_url, p.content, p.created_at, p.media_type,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) AS like_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `;
    const posts = await queryDB(postsQuery, [user.user_id]);

    res.status(200).json(posts);
  } catch (err) {
    console.error("Error fetching user posts by username:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, profile_picture')
      .ilike('username', `%${q.toLowerCase()}%`)
      .order('username');
    if (error) throw error;

    res.status(200).json(data);
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
  getUserProfile,
  updateProfile,
  getUserProfileByUsername,
  getUserPostsByUsername,
  searchUsers,
  fixProfilePictureURLs,
};