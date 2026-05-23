const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');

// Protected Inventory Routes (Authenticated Staff & Owners)
router.get('/', authenticate, inventoryController.getInventory);
router.post('/', authenticate, inventoryController.addInventoryItem);
router.patch('/:id', authenticate, inventoryController.updateInventoryItem);
router.delete('/:id', authenticate, inventoryController.deleteInventoryItem);

module.exports = router;
