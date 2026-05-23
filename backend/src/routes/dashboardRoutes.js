const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

// Protected Dashboard Live Stats API
router.get('/stats', authenticate, dashboardController.getDashboardStats);
router.get('/sidebar-telemetry', authenticate, dashboardController.getSidebarTelemetry);

module.exports = router;
