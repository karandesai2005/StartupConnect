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
  validateUsernameInput, // Corrected from validateUsernameInputcipher
  validateSaveUserDetailsInput
} = require('../middleware/validator');
const authenticateJWT = require('../middleware/authenticateJWT');
const { uploadProfilePicture } = require('../config/multerConfig');

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