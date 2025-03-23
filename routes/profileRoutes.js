const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authenticateJWT');

// Get authenticated user's profile
router.get('/', authMiddleware, profileController.getProfile);

// Get another user's profile by username
router.get('/user/:username', authMiddleware, profileController.getUserProfile);

// Get authenticated user's stories
router.get('/stories', authMiddleware, profileController.getStories);

// Get another user's stories
router.get('/stories/user/:username', authMiddleware, profileController.getUserStories);

// Add a story (authenticated user only)
router.post('/stories', authMiddleware, profileController.addStory);

// Get authenticated user's sections
router.get('/sections', authMiddleware, profileController.getSections);

// Get another user's sections
router.get('/sections/user/:username', authMiddleware, profileController.getUserSections);

// Add a section (authenticated user only)
router.post('/sections', authMiddleware, profileController.addSection);

// Get authenticated user's graphs
router.get('/graphs', authMiddleware, profileController.getGraphs);

// Get another user's graphs
router.get('/graphs/user/:username', authMiddleware, profileController.getUserGraphs);

// Add a graph (authenticated user only)
router.post('/graphs', authMiddleware, profileController.addGraph);

// Follow a user
router.post('/follow', authMiddleware, profileController.followUser);

// Unfollow a user (optional)
router.post('/unfollow', authMiddleware, profileController.unfollowUser);

module.exports = router;