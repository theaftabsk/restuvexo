const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticate } = require('../middleware/auth');

// Protected Table Routes
router.get('/', authenticate, tableController.getTables);
router.post('/', authenticate, tableController.createTable);
router.put('/:id', authenticate, tableController.updateTable);
router.delete('/:id', authenticate, tableController.deleteTable);
router.get('/active-sessions', authenticate, tableController.getActiveSessions);
router.delete('/active-sessions/:sessionId', authenticate, tableController.clearActiveSession);
router.get('/settings', authenticate, tableController.getSettings);
router.post('/settings', authenticate, tableController.updateSettings);

// Blacklist & Spam Protection
router.post('/block-device', authenticate, tableController.blockDevice);
router.get('/blacklisted-devices', authenticate, tableController.getBlacklistedDevices);
router.delete('/blacklisted-devices/:deviceId', authenticate, tableController.unblockDevice);

module.exports = router;
