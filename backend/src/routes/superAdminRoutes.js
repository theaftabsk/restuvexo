const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');

// System Dashboard Stats
router.get('/stats', superAdminController.getStats);

// Restaurant Management
router.get('/restaurants', superAdminController.getRestaurants);
router.get('/restaurants/:id', superAdminController.getRestaurantById);
router.put('/restaurants/:id/settings', superAdminController.updateRestaurantSettings);
router.delete('/restaurants/:id', superAdminController.deleteRestaurant);

// Demo Requests Management
router.get('/demo-requests', superAdminController.getDemoRequests);
router.put('/demo-requests/:id', superAdminController.updateDemoRequest);
router.delete('/demo-requests/:id', superAdminController.deleteDemoRequest);

module.exports = router;
