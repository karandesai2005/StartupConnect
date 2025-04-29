const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  deleteAccount,
  validateUsername,
  saveUserDetails,
  testSupabaseAdmin,
} = require('../controllers/authController');
const {
  validateUsernameInput,
  validateSaveUserDetailsInput,
} = require('../middleware/validator');
const authenticateJWT = require('../middleware/authenticateJWT');

// Debug imports
console.log('authController imports:', {
  register: typeof register,
  login: typeof login,
  logout: typeof logout,
  deleteAccount: typeof deleteAccount,
  validateUsername: typeof validateUsername,
  saveUserDetails: typeof saveUserDetails,
  testSupabaseAdmin: typeof testSupabaseAdmin,
});
console.log('authenticateJWT:', typeof authenticateJWT);

// Authentication Routes
router.route('/register')
  .post(validateSaveUserDetailsInput, register);

router.route('/login')
  .post(login);

router.route('/logout')
  .post(authenticateJWT, logout);

// User Management Routes
router.route('/validate-username')
  .post(validateUsernameInput, validateUsername);

router.route('/save-user-details')
  .post(validateSaveUserDetailsInput, saveUserDetails);

router.route('/test-supabase-admin')
  .get(testSupabaseAdmin);

router.route('/delete-account')
  .delete(authenticateJWT, deleteAccount);

module.exports = router;