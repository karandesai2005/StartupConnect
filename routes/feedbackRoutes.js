const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authenticateJWT = require('../middleware/authenticateJWT');

router.route('/')
  .post(authenticateJWT, feedbackController.submitFeedback);

module.exports = router;