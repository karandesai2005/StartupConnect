const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authenticateJWT');

// Profile Routes
router.route('/')
  .get(authMiddleware, profileController.getProfile)
  .put(authMiddleware, profileController.updateProfile);

router.route('/user/:username')
  .get(authMiddleware, profileController.getUserProfile);

router.route('/profile-picture')
  .post(authMiddleware, profileController.updateProfilePicture);

router.route('/posts/user/:username')
  .get(authMiddleware, profileController.getUserPostsByUsername);

router.route('/search-users')
  .get(authMiddleware, profileController.searchUsers);

router.route('/fix-profile-picture-urls')
  .post(authMiddleware, profileController.fixProfilePictureURLs);

// Story Routes
router.route('/stories')
  .get(authMiddleware, profileController.getStories)
  .post(authMiddleware, profileController.addStory);

router.route('/stories/:storyId')
  .delete(authMiddleware, profileController.deleteStory);

// Section Routes
router.route('/sections')
  .get(authMiddleware, profileController.getSections)
  .post(authMiddleware, profileController.addSection);

router.route('/sections/:sectionId')
  .delete(authMiddleware, profileController.deleteSection);

// Graph Routes
router.route('/graphs')
  .get(authMiddleware, profileController.getGraphs)
  .post(authMiddleware, profileController.addGraph);

router.route('/graphs/:graphId')
  .delete(authMiddleware, profileController.deleteGraph);

// Follow Routes
router.route('/follow/:username')
  .post(authMiddleware, profileController.followUser)
  .delete(authMiddleware, profileController.unfollowUser);

module.exports = router;