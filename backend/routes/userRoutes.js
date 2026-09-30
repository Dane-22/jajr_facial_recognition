const express = require('express');
const router = express.Router();
const { registerUser, getAllUsers } = require('../controllers/userController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/register', verifyAdminToken, registerUser);
router.get('/', verifyAdminToken, getAllUsers);

module.exports = router;
