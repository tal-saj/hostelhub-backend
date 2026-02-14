const express = require('express');
const { signup2, login2, addReviewToHostel } = require('../controllers/User2Controller');
const verifyToken2 = require('../middlewares/verifyToken2');

const router = express.Router();

router.post('/signup2', signup2);
router.post('/login2', login2);
router.post('/review', verifyToken2, addReviewToHostel);  // Protect this route

module.exports = router;
