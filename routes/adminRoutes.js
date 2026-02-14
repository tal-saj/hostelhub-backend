const express = require('express');
const router = express.Router();
const { adminLogin, getAllUsers, updateUserStatus,updateUserStatusV2 } = require('../controllers/adminController');

// Admin Login Route
router.post('/login', adminLogin);

// Get all users for admin dashboard
router.get('/users', getAllUsers);

// Update user status (approve/reject)
router.post('/update-user-status', updateUserStatus);

// Route to update user status
router.post('/update-user-status-v2', updateUserStatusV2);

module.exports = router;
