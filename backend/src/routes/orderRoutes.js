const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

// Public QR Menu & Customer ordering endpoints
router.post('/generate-templink', orderController.generateTemplink);
router.get('/qr-menu/:tableId', orderController.getQrMenu);
router.post('/qr-place', orderController.createQrOrder);

// Protected Order Paths
router.post('/', authenticate, orderController.createOrder); // Place order
router.get('/', authenticate, orderController.getOrders); // Fetch order queue
router.put('/:id', authenticate, orderController.updateOrder); // Update existing order (POS Edit)
router.patch('/:id/status', authenticate, orderController.updateOrderStatus); // Update Cooking Status
router.patch('/:id/approve', authenticate, orderController.approveQrOrder); // Approve QR self-orders
router.patch('/:id/settle', authenticate, orderController.settleOrder); // Settle Payment
router.delete('/:id', authenticate, orderController.deleteOrder); // Delete Order Permanently

module.exports = router;
