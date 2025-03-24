const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authenticateJWT');

// Get authenticated user's profile
router.get('/', authMiddleware, profileController.getProfile);

// Get another user's profile by username
router.get('/user/:username', authMiddleware, profileController.getUserProfile);

<<<<<<< HEAD
// Get authenticated user's stories
router.get('/stories', authMiddleware, profileController.getStories);

// Get another user's stories
router.get('/stories/user/:username', authMiddleware, profileController.getUserStories);

// Add a story (authenticated user only)
=======
// Stories
router.get('/stories', authMiddleware, profileController.getStories);
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
router.post('/stories', authMiddleware, profileController.addStory);
router.delete('/stories/:storyId', authMiddleware, profileController.deleteStory); // New DELETE route

<<<<<<< HEAD
// Get authenticated user's sections
router.get('/sections', authMiddleware, profileController.getSections);

// Get another user's sections
router.get('/sections/user/:username', authMiddleware, profileController.getUserSections);

// Add a section (authenticated user only)
=======
// Sections
router.get('/sections', authMiddleware, profileController.getSections);
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
router.post('/sections', authMiddleware, profileController.addSection);
router.delete('/sections/:sectionId', authMiddleware, profileController.deleteSection); // New DELETE route

<<<<<<< HEAD
// Get authenticated user's graphs
router.get('/graphs', authMiddleware, profileController.getGraphs);

// Get another user's graphs
router.get('/graphs/user/:username', authMiddleware, profileController.getUserGraphs);

// Add a graph (authenticated user only)
=======
// Graphs
router.get('/graphs', authMiddleware, profileController.getGraphs);
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
router.post('/graphs', authMiddleware, profileController.addGraph);
router.delete('/graphs/:graphId', authMiddleware, profileController.deleteGraph); // New DELETE route

// Follow/Unfollow
router.post('/follow', authMiddleware, profileController.followUser);
router.post('/unfollow', authMiddleware, profileController.unfollowUser);

module.exports = router;