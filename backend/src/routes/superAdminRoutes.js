const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');

router.get('/restaurants', superAdminController.getRestaurants);
router.put('/restaurants/:id/settings', superAdminController.updateRestaurantSettings);

module.exports = router;
