const express = require("express");
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
  searchUsers,
  submitFeedback, // Add the new function
} = require("../controllers/authController");

const {
  validateUsernameInput,
  validateSaveUserDetailsInput,
} = require("../middleware/validator");

const authenticateJWT = require("../middleware/authenticateJWT");
const { uploadProfilePicture } = require("../config/multerConfig");

const router = express.Router();

// Public routes
router.post("/register", validateSaveUserDetailsInput, register);
router.post("/login", login);
router.post("/validate-username", validateUsernameInput, validateUsername);
router.post("/save-user-details", validateSaveUserDetailsInput, saveUserDetails);

// Protected routes
router.post("/logout", authenticateJWT, logout);
router.delete("/delete-account", authenticateJWT, deleteAccount);
router.get("/profile", authenticateJWT, getUserProfile);
router.put("/update-profile", authenticateJWT, uploadProfilePicture.single('profile_picture'), updateProfile);
router.get("/users/:username", authenticateJWT, getUserProfileByUsername);
router.get("/posts/user/:username", authenticateJWT, getUserPostsByUsername);
router.get("/search-users", authenticateJWT, searchUsers);
router.post("/feedback", authenticateJWT, submitFeedback); // Add the new feedback route

module.exports = router;