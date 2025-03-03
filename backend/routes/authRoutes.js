// routes/authRoute.js
const express = require("express");
const { 
  register, 
  login, 
  validateUsername, 
  saveUserDetails, 
  getUserProfile,
  updateProfile,
  getUserProfileByUsername, // New endpoint
  getUserPostsByUsername    // New endpoint
} = require("../controllers/authController");

const { 
  validateUsernameInput, 
  validateSaveUserDetailsInput 
} = require("../middleware/validator");

const authenticateJWT = require("../middleware/authenticateJWT");  
const { uploadProfilePicture } = require("../config/multerConfig");

const router = express.Router();

// Register user
router.post("/register", validateSaveUserDetailsInput, register);

// Login user
router.post("/login", login);

// Validate username availability
router.post("/validate-username", validateUsernameInput, validateUsername);

// Save user details step-by-step
router.post("/save-user-details", validateSaveUserDetailsInput, saveUserDetails);

// Fetch current user's profile (protected)
router.get("/profile", authenticateJWT, getUserProfile);

// Update current user's profile (protected)
router.put("/update-profile",  
  authenticateJWT,  
  uploadProfilePicture.single('profile_picture'),
  updateProfile
);

// New route: Fetch user profile by username (protected)
router.get("/users/:username", authenticateJWT, getUserProfileByUsername);

// New route: Fetch user posts by username (protected)
router.get("/posts/user/:username", authenticateJWT, getUserPostsByUsername);

module.exports = router;