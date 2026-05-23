const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate, checkRole } = require('../middleware/auth');

// Public Authentication Endpoints
router.post('/owner/signup', authController.ownerSignup);
router.post('/verify-otp', authController.verifyOtp); // Verification API
router.post('/login', authController.login); // Single Unified Login API
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected Staff Management Endpoints (Owner Only)
router.post('/staff', authenticate, checkRole('owner'), authController.addStaff);
router.get('/staff', authenticate, checkRole('owner'), authController.getStaff);
router.put('/staff/:id', authenticate, checkRole('owner'), authController.editStaff);
router.patch('/staff/:id/status', authenticate, checkRole('owner'), authController.updateStaffStatus);
router.patch('/staff/:id/permissions', authenticate, checkRole('owner'), authController.updateStaffPermissions);
router.delete('/staff/:id', authenticate, checkRole('owner'), authController.deleteStaff);

module.exports = router;
