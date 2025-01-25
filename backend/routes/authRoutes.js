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

// Register user (add validation middleware if needed for step 1 data)
router.post("/register", validateSaveUserDetailsInput, register);

// Login user
router.post("/login", login);


// Validate username availability
router.post("/validate-username", validateUsernameInput, validateUsername);

// Save user details step-by-step
router.post("/save-user-details", validateSaveUserDetailsInput, saveUserDetails);

module.exports = router;
