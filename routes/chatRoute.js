const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/chats', chatController.getUserChats);
router.post('/chats', chatController.createChat);
router.put('/chats/:chatId/read', chatController.updateLastRead);

module.exports = router;