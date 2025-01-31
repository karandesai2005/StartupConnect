// routes/appRoute.js
const express = require("express");
const { 
  register, 
  login, 
  validateUsername, 
  saveUserDetails, 
  getUserProfile,
  updateProfile
} = require("../controllers/authController");

const { 
  validateUsernameInput, 
  validateSaveUserDetailsInput 
} = require("../middleware/validator");

const authenticateJWT = require("../middleware/authenticateJWT");  // Import the middleware

const upload = require("../config/multerConfig");
const router = express.Router();

// Register user (add validation middleware if needed for step 1 data)
router.post("/register", validateSaveUserDetailsInput, register);

// Login user
router.post("/login", login);

// Validate username availability
router.post("/validate-username", validateUsernameInput, validateUsername);

// Save user details step-by-step
router.post("/save-user-details", validateSaveUserDetailsInput, saveUserDetails);

// Fetch user profile (protected route)
router.get("/profile", authenticateJWT, getUserProfile);  // Apply authenticateJWT middleware here

router.put("/update-profile", 
  authenticateJWT,  // Ensure user is authenticated
  upload.single('profile_picture'),  // Handle single file upload
  updateProfile
);
module.exports = router;
