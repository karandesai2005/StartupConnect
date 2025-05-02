const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authenticateJWT');

// Debug middleware
const debugMiddleware = (req, res, next) => {
  console.log('=== Profile Route Debug ===');
  console.log('Route:', req.originalUrl, '| Method:', req.method);
  console.log('User:', req.user);
  console.log('Query:', req.query);
  if (req.file) {
    console.log('Processed File:', req.file.filename, '| Type:', req.file.mimetype);
  } else if (req.method === 'POST') {
    console.log('No media uploaded.');
  }
  next();
};

// Profile Routes
router.route('/')
  .get(authMiddleware, debugMiddleware, profileController.getProfile)
  .put(authMiddleware, debugMiddleware, profileController.updateProfile);

router.route('/user/:username')
  .get(authMiddleware, debugMiddleware, profileController.getUserProfile);

router.route('/profile-picture')
  .post(authMiddleware, debugMiddleware, profileController.updateProfilePicture);

router.route('/posts/user/:username')
  .get(authMiddleware, debugMiddleware, profileController.getUserPostsByUsername);

router.route('/search-users')
  .get(authMiddleware, debugMiddleware, profileController.searchUsers);

router.route('/fix-profile-picture-urls')
  .post(authMiddleware, debugMiddleware, profileController.fixProfilePictureURLs);

// Story Routes
router.route('/stories')
  .get(authMiddleware, debugMiddleware, profileController.getStories)
  .post(authMiddleware, debugMiddleware, profileController.addStory);

router.route('/stories/:storyId')
  .delete(authMiddleware, debugMiddleware, profileController.deleteStory);

router.route('/stories/user/:username')
  .get(authMiddleware, debugMiddleware, profileController.getUserStories);

// Section Routes
router.route('/sections')
  .get(authMiddleware, debugMiddleware, profileController.getSections)
  .post(authMiddleware, debugMiddleware, profileController.addSection);

router.route('/sections/:sectionId')
  .delete(authMiddleware, debugMiddleware, profileController.deleteSection);

router.route('/sections/user/:username')
  .get(authMiddleware, debugMiddleware, profileController.getUserSections);

// Graph Routes
router.route('/graphs')
  .get(authMiddleware, debugMiddleware, profileController.getGraphs)
  .post(authMiddleware, debugMiddleware, profileController.addGraph);

router.route('/graphs/:graphId')
  .delete(authMiddleware, debugMiddleware, profileController.deleteGraph);

router.route('/graphs/user/:username')
  .get(authMiddleware, debugMiddleware, profileController.getUserGraphs);

// Follow Routes
router.route('/follow/:username')
  .post(authMiddleware, debugMiddleware, profileController.followUser)
  .delete(authMiddleware, debugMiddleware, profileController.unfollowUser);

module.exports = router;