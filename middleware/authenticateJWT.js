const jwt = require('jsonwebtoken');
const { queryDB } = require('../config/db');

const authenticateJWT = async (req, res, next) => {
  console.log('=== Auth Middleware Debug ===');
  console.log('Headers:', req.headers);
  
  const authHeader = req.headers['authorization'];
  console.log('Auth header:', authHeader);
  
  const token = authHeader?.split(' ')[1];
  console.log('Extracted token:', token ? 'Token found' : 'No token');

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    // Check if token is blacklisted
    const blacklistQuery = `
      SELECT * FROM public.token_blacklist WHERE token = $1
    `;
    const blacklistResult = await queryDB(blacklistQuery, [token]);
    console.log('Blacklist check result:', blacklistResult);

    if (blacklistResult.length > 0) {
      return res.status(401).json({ message: "Token has been invalidated." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token payload:', decoded);
    req.user = decoded;
    console.log('req.user set to:', req.user);
    next();
  } catch (err) {
    console.error("JWT verification or blacklist check error:", err);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = authenticateJWT;