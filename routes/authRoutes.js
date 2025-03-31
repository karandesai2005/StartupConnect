const express = require("express");
const { validateUsernameInput, validateSaveUserDetailsInput } = require("../middleware/validator");
const authenticateJWT = require("../middleware/authenticateJWT");
const { uploadProfilePicture, uploadAndConvertPostMedia } = require("../config/multerConfig"); // Update to use uploadAndConvertPostMedia
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
  fixProfilePictureURLs
} = require("../controllers/authController");

const router = express.Router();

// Public routes
router.post("/register", validateSaveUserDetailsInput, register);
router.post("/login", login);
router.post("/validate-username", validateUsernameInput, validateUsername);
router.post("/save-user-details", validateSaveUserDetailsInput, uploadAndConvertPostMedia, saveUserDetails); // Fixed: Use uploadAndConvertPostMedia

// Protected routes
router.post("/logout", authenticateJWT, logout);
router.delete("/delete-account", authenticateJWT, deleteAccount);
router.get("/profile", authenticateJWT, getUserProfile);
router.put("/update-profile", authenticateJWT, uploadProfilePicture.single('profile_picture'), updateProfile);
router.get("/users/:username", authenticateJWT, getUserProfileByUsername);
router.get("/posts/user/:username", authenticateJWT, getUserPostsByUsername);
router.get("/search-users", authenticateJWT, searchUsers);
router.post("/fix-profile-picture-urls", authenticateJWT, fixProfilePictureURLs);

module.exports = router;