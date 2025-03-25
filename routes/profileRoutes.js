const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authenticateJWT');

// Get authenticated user's profile
router.get('/', authMiddleware, profileController.getProfile);

// Get another user's profile by username
router.get('/user/:username', authMiddleware, profileController.getUserProfile);

// Stories
router.get('/stories', authMiddleware, profileController.getStories);
router.post('/stories', authMiddleware, profileController.addStory);
router.delete('/stories/:storyId', authMiddleware, profileController.deleteStory); // New DELETE route

// Sections
router.get('/sections', authMiddleware, profileController.getSections);
router.post('/sections', authMiddleware, profileController.addSection);
router.delete('/sections/:sectionId', authMiddleware, profileController.deleteSection); // New DELETE route

// Graphs
router.get('/graphs', authMiddleware, profileController.getGraphs);
router.post('/graphs', authMiddleware, profileController.addGraph);
router.delete('/graphs/:graphId', authMiddleware, profileController.deleteGraph); // New DELETE route

// Follow/Unfollow
router.post('/follow', authMiddleware, profileController.followUser);
router.post('/unfollow', authMiddleware, profileController.unfollowUser);
router.delete('/sections/:sectionId/team/:username', authMiddleware, profileController.deleteTeamMember);
module.exports = router;