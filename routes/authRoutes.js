const express = require('express');
const router = express.Router();
const {
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
  searchUsers
} = require('../controllers/authController');
const {
  validateUsernameInput,
  validateSaveUserDetailsInput
} = require('../middleware/validator');
const authenticateJWT = require('../middleware/authenticateJWT');
const { uploadProfilePicture } = require('../config/multerConfig');

// Debug imports
console.log('authController imports:', {
  register: typeof register,
  login: typeof login,
  logout: typeof logout,
  deleteAccount: typeof deleteAccount,
  validateUsername: typeof validateUsername,
  saveUserDetails: typeof saveUserDetails,
  getUserProfile: typeof getUserProfile,
  updateProfile: typeof updateProfile,
  getUserProfileByUsername: typeof getUserProfileByUsername,
  getUserPostsByUsername: typeof getUserPostsByUsername,
  searchUsers: typeof searchUsers
});
console.log('authenticateJWT:', typeof authenticateJWT);
console.log('uploadProfilePicture:', typeof uploadProfilePicture);

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

// Profile Routes
router.route('/profile')
  .get(authenticateJWT, getUserProfile);

router.route('/update-profile')
  .put(authenticateJWT, uploadProfilePicture.single('profile_picture'), updateProfile);

router.route('/users/:username')
  .get(authenticateJWT, getUserProfileByUsername);

// User Content Routes
router.route('/posts/user/:username')
  .get(authenticateJWT, getUserPostsByUsername);

router.route('/search-users')
  .get(authenticateJWT, searchUsers);

module.exports = router;