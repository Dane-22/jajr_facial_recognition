const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  changePassword, 
  getSettings, 
  updateSettings,
  exportBackup,
  clearCache 
} = require('../controllers/adminController');
const { validateAdminLogin } = require('../middleware/validation');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/login', validateAdminLogin, adminLogin);
router.get('/all', verifyAdminToken, getAllAdmins);
router.post('/create', verifyAdminToken, createAdmin);
router.put('/:id', verifyAdminToken, updateAdmin);
router.delete('/:id', verifyAdminToken, deleteAdmin);

router.post('/change-password', verifyAdminToken, changePassword);
router.get('/settings', verifyAdminToken, getSettings);
router.post('/settings', verifyAdminToken, updateSettings);
router.get('/backup', verifyAdminToken, exportBackup);
router.post('/clear-cache', verifyAdminToken, clearCache);

module.exports = router;
