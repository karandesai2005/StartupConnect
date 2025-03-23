// backend/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authenticateJWT');

// Get authenticated user's profile
router.get('/', authMiddleware, profileController.getProfile);

// Get another user's profile by username
router.get('/user/:username', authMiddleware, profileController.getUserProfile);

// Get stories
router.get('/stories', authMiddleware, profileController.getStories);

// Add a story (Multer is handled in addStory)
router.post('/stories', authMiddleware, profileController.addStory);

// Get sections
router.get('/sections', authMiddleware, profileController.getSections);

// Add a section
router.post('/sections', authMiddleware, profileController.addSection);

// Get graphs
router.get('/graphs', authMiddleware, profileController.getGraphs);

// Add a graph
router.post('/graphs', authMiddleware, profileController.addGraph);

// Follow a user
router.post('/follow', authMiddleware, profileController.followUser);

// Unfollow a user (optional)
router.post('/unfollow', authMiddleware, profileController.unfollowUser);

module.exports = router;