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
  getHealth,
  exportBackup,
  clearCache 
} = require('../controllers/adminController');
const { validateAdminLogin } = require('../middleware/validation');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const { getSites, saveSite, saveAssignments, correctTimeOut } = require('../controllers/siteController');

router.post('/login', validateAdminLogin, adminLogin);
router.get('/all', verifyAdminToken, getAllAdmins);
router.post('/create', verifyAdminToken, createAdmin);
router.put('/:id', verifyAdminToken, updateAdmin);
router.delete('/:id', verifyAdminToken, deleteAdmin);

router.post('/change-password', verifyAdminToken, changePassword);
router.get('/settings', verifyAdminToken, getSettings);
router.post('/settings', verifyAdminToken, updateSettings);
router.get('/sites', verifyAdminToken, getSites);
router.post('/sites', verifyAdminToken, saveSite);
router.put('/sites/:id', verifyAdminToken, saveSite);
router.put('/site-assignments/:userId', verifyAdminToken, saveAssignments);
router.post('/time-out-corrections/:userId', verifyAdminToken, correctTimeOut);
router.get('/health', verifyAdminToken, getHealth);
router.get('/backup', verifyAdminToken, exportBackup);
router.post('/clear-cache', verifyAdminToken, clearCache);

module.exports = router;
