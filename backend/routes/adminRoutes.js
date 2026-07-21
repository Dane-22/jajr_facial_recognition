const express = require('express');
const router = express.Router();
const { adminLogin } = require('../controllers/adminController');
const { validateAdminLogin } = require('../middleware/validation');

router.post('/login', validateAdminLogin, adminLogin);

module.exports = router;
