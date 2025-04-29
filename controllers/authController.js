require('dotenv').config();
const { supabase } = require('../services/supabase');
const { queryDB } = require('../config/db');

// Constants
const BASE_URL = process.env.BASE_URL || 'https://pitch-backend-env.eba-ep4nstmn.ap-south-1.elasticbeanstalk.com';

// Utility Functions
const cleanUrl = (url) => {
  if (!url) return url;
  return url
    .replace(/\/+/g, '/') // Normalize multiple slashes
    .replace('http:/', 'http://')
    .replace('https:/', 'https://');
};

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

// Register user
const register = async (req, res) => {
  try {
    const { username, email, supabase_uid, isFounder, isInvestor } = req.body;

    if (!username || !email || !supabase_uid) {
      return res.status(400).json({ message: 'Username, email, and supabase_uid are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', normalizedEmail);
    if (checkError) throw checkError;
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
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
      message: 'User registered successfully',
      user: { user_id: data.user_id, username, email: normalizedEmail },
    });
  } catch (err) {
    console.error('Registration error:', err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    res.status(200).json({ message: 'Login handled by Supabase client-side. Use /profile to verify.' });
  } catch (err) {
    console.error('Login error:', err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    res.status(200).json({ message: 'Logout handled by Supabase client-side' });
  } catch (err) {
    console.error('Logout error:', err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
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
      return res.status(404).json({ message: 'User not found' });
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

    const { error: authError } = await supabase.auth.admin.deleteUser(supabase_uid);
    if (authError) console.warn('Failed to delete auth user:', authError.message);

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Save user details step-by-step
const saveUserDetails = async (req, res) => {
  console.log('Request Body:', req.body);

  try {
    const { step, data } = req.body;

    if (!step || !data || !data.supabase_uid) {
      return res.status(400).json({ message: 'Step, data, and supabase_uid are required.' });
    }

    switch (step) {
      case 1:
        return res.status(200).json({ message: 'Email handled by Supabase auth' });

      case 2:
        console.log('Attempting password update for user:', data.supabase_uid);
        if (!data.password || !validatePassword(data.password)) {
          console.log('Password validation failed:', data.password);
          return res.status(400).json({
            message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character.',
          });
        }
        const { error: authError } = await supabase.auth.admin.updateUserById(data.supabase_uid, {
          password: data.password,
        });
        if (authError) {
          console.error('Supabase auth error:', authError.message);
          throw new Error(`Failed to update password: ${authError.message}`);
        }
        console.log('Password updated successfully for user:', data.supabase_uid);
        return res.status(200).json({ message: 'Password updated successfully' });

      case 3:
        if (!data.username || data.username.length < 3 || data.username.length > 20) {
          return res.status(400).json({ message: 'Username must be between 3 and 20 characters.' });
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
        if (data.preference !== 'personal' && data.preference !== 'business') {
          return res.status(400).json({ message: 'Invalid preference.' });
        }
        const { error: prefError } = await supabase
          .from('users')
          .update({
            is_personal: data.preference === 'personal' ? 1 : 0,
            is_business: data.preference === 'business' ? 1 : 0,
          })
          .eq('supabase_uid', data.supabase_uid)
          .select('user_id')
          .single();
        if (prefError) throw prefError;
        break;

      case 5:
        if (!data.realName || data.realName.trim() === '') {
          return res.status(400).json({ message: 'Real name is required.' });
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
          return res.status(400).json({ message: 'At least 3 interests are required.' });
        }
        const { data: userData, error: interestsError } = await supabase
          .from('users')
          .update({ interests: data.interests })
          .eq('supabase_uid', data.supabase_uid)
          .select('user_id, email, username, profile_picture')
          .single();
        if (interestsError) throw interestsError;
        return res.status(200).json({
          message: 'Registration completed successfully',
          user: {
            user_id: userData.user_id,
            email: userData.email,
            username: userData.username,
            profile_picture: cleanUrl(userData.profile_picture),
          },
        });

      default:
        return res.status(400).json({ message: 'Invalid step.' });
    }

    res.status(200).json({ message: 'Data saved successfully' });
  } catch (err) {
    console.error('Error saving user details:', err.message, err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Validate username availability
const validateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    console.log('Validating username:', username);

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        available: false,
        message: 'Username must be between 3 and 20 characters',
      });
    }

    const { data: existingUsers, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username);
    if (error) throw error;

    console.log('Query result:', existingUsers);

    if (existingUsers.length > 0) {
      return res.status(200).json({
        available: false,
        message: 'Username already exists',
      });
    }

    res.status(200).json({
      available: true,
      message: 'Username is available',
    });
  } catch (err) {
    console.error('Error validating username:', err.stack);
    res.status(500).json({
      available: false,
      message: 'Error validating username',
      error: err.message,
    });
  }
};

// Test Supabase admin
const testSupabaseAdmin = async (req, res) => {
  try {
    console.log('Testing Supabase admin client with URL:', process.env.SUPABASE_URL);
    console.log('Service key starts with:', process.env.SUPABASE_SERVICE_KEY.substring(0, 10) + '...');
    const { data, error } = await supabase.auth.admin.getUserById('17139052-480b-4897-998b-065d524739e6');
    if (error) {
      console.error('Admin test error:', error.message, error.stack);
      throw error;
    }
    res.status(200).json({ message: 'Admin test successful', user: data });
  } catch (err) {
    console.error('Admin test failed:', err.message, err.stack);
    res.status(500).json({ message: 'Admin test failed', error: err.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  deleteAccount,
  validateUsername,
  saveUserDetails,
  testSupabaseAdmin,
};