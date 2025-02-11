const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  console.log('=== Auth Middleware Debug ===');
  console.log('Headers:', req.headers);
  
  const authHeader = req.headers['authorization'];
  console.log('Auth header:', authHeader);
  
  const token = authHeader?.split(' ')[1];
  console.log('Extracted token:', token ?   'Token found' : 'No token');

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token payload:', decoded);
    req.user = decoded;
    console.log('req.user set to:', req.user);
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = authenticateJWT;