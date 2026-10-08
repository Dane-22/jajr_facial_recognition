const express = require('express');
const router = express.Router();
const { 
  getAllEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  setEmployeeStatus,
  deleteEmployee 
} = require('../controllers/employeeController');
const { validateEmployee } = require('../middleware/validation');
const { cacheMiddleware, clearCache } = require('../middleware/cache');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const { requireSuperadmin } = require('../middleware/requireSuperadmin');

// Get all employees (public read – kiosk and admin both need this)
router.get('/', verifyAdminToken, getAllEmployees);

// Get single employee by ID
router.get('/:id', verifyAdminToken, getEmployeeById);

// Create new employee — admin only (clears cache)
router.post('/', verifyAdminToken, validateEmployee, (req, res, next) => {
  clearCache('employees');
  next();
}, createEmployee);

// Update employee — admin only (clears cache)
router.put('/:id', verifyAdminToken, validateEmployee, (req, res, next) => {
  clearCache('employees');
  next();
}, updateEmployee);

// Archive or restore without removing attendance history.
router.patch('/:id/status', verifyAdminToken, requireSuperadmin, (req, res, next) => {
  clearCache('employees');
  next();
}, setEmployeeStatus);

// Retain the legacy route with an explicit refusal; physical deletion can cascade into history.
router.delete('/:id', verifyAdminToken, deleteEmployee);

module.exports = router;
