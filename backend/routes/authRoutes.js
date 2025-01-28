const express = require("express");
const { 
  register, 
  login, 
  validateUsername, 
  saveUserDetails 
} = require("../controllers/authController");
const { 
  validateUsernameInput, 
  validateSaveUserDetailsInput 
} = require("../middleware/validator");

const router = express.Router();

const { getUserProfile } = require("../controllers/authController");

// Register user (add validation middleware if needed for step 1 data)
router.post("/register", validateSaveUserDetailsInput, register);

// Login user
router.post("/login", login);


// Validate username availability
router.post("/validate-username", validateUsernameInput, validateUsername);

// Save user details step-by-step
router.post("/save-user-details", validateSaveUserDetailsInput, saveUserDetails);


// Fetch user profile (this should return profile data for the authenticated user)
router.get("/profile", getUserProfile);
module.exports = router;
