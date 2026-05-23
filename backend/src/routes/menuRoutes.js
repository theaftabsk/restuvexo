const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticate } = require('../middleware/auth');

// Protected Menu Management Routes
router.post('/categories', authenticate, menuController.createCategory);
router.get('/categories', authenticate, menuController.getCategories);
router.put('/categories/:id', authenticate, menuController.updateCategory);
router.delete('/categories/:id', authenticate, menuController.deleteCategory);

router.post('/menu-items', authenticate, menuController.createMenuItem);
router.get('/menu-items', authenticate, menuController.getMenuItems);
router.put('/menu-items/:id', authenticate, menuController.updateMenuItem);
router.delete('/menu-items/:id', authenticate, menuController.deleteMenuItem);

module.exports = router;
