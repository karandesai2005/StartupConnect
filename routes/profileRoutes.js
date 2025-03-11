const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authenticateJWT'); // Adjust mpath to your auth middleware

router.get('/stories', authMiddleware, profileController.getStories);
router.post('/stories', authMiddleware, profileController.addStory);

router.get('/sections', authMiddleware, profileController.getSections);
router.post('/sections', authMiddleware, profileController.addSection);

router.get('/graphs', authMiddleware, profileController.getGraphs);
router.post('/graphs', authMiddleware, profileController.addGraph);

module.exports = router;