// routes/authRoute.js
const express = require("express");
const {
  register,
  login,
  validateUsername,
  saveUserDetails,
  getUserProfile,
  updateProfile,
  getUserProfileByUsername,
  getUserPostsByUsername,
  searchUsers
} = require("../controllers/authController");

const {
  validateUsernameInput,
  validateSaveUserDetailsInput
} = require("../middleware/validator");

const authenticateJWT = require("../middleware/authenticateJWT");
const { uploadProfilePicture } = require("../config/multerConfig");

const router = express.Router();

router.post("/register", validateSaveUserDetailsInput, register);

router.post("/login", login);

router.post("/validate-username", validateUsernameInput, validateUsername);

router.post("/save-user-details", validateSaveUserDetailsInput, saveUserDetails);

router.get("/profile", authenticateJWT, getUserProfile);

router.put("/update-profile",
  authenticateJWT,
  uploadProfilePicture.single('profile_picture'),
  updateProfile
);

router.get("/users/:username", authenticateJWT, getUserProfileByUsername);

router.get("/posts/user/:username", authenticateJWT, getUserPostsByUsername);

router.get("/search-users", authenticateJWT, searchUsers);
module.exports = router;