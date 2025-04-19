const { supabase } = require('../services/supabase');

const authenticateJWT = async (req, res, next) => {
  console.log('=== Auth Middleware ===');
  const token = req.headers.authorization?.split('Bearer ')[1];
  console.log('Token:', token ? 'Found' : 'Missing');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify Supabase JWT
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user || !user.email_confirmed_at) {
      console.log('Supabase auth error:', error?.message);
      return res.status(401).json({ message: 'Invalid or unverified token' });
    }

    // Check if user exists in users table
    const { data, error: dbError } = await supabase
      .from('users')
      .select('user_id')
      .eq('supabase_uid', user.id)
      .single();
    if (dbError || !data) {
      console.log('Database error:', dbError?.message);
      return res.status(401).json({ message: 'User not found in users table' });
    }

    // Attach user data to request
    req.user = { id: user.id, email: user.email, user_id: data.user_id };
    console.log('Authenticated user:', req.user);
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authenticateJWT;