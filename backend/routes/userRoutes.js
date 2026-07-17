const express = require('express');
const router = express.Router();
const { registerUser, getAllUsers } = require('../controllers/userController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.get('/', getAllUsers);

module.exports = router;
