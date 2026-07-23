const express = require('express');
const router = express.Router();
const { registerUser, getAllUsers } = require('../controllers/userController');
const { verifyKioskOrAdminToken } = require('../middleware/kioskAuth');

router.post('/register', verifyKioskOrAdminToken, registerUser);
router.get('/', verifyKioskOrAdminToken, getAllUsers);

module.exports = router;
