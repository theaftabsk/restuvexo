const express = require('express');
const router = express.Router();
const { createDemoRequest, getDemoRequests } = require('../controllers/demoController');

// Submit free demo request
router.post('/', createDemoRequest);

// Retrieve all demo requests
router.get('/', getDemoRequests);

module.exports = router;
