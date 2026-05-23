const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticate } = require('../middleware/auth');

// Protected Chatbot API
router.post('/chat', authenticate, chatbotController.handleChat);

module.exports = router;
