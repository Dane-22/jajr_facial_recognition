const express = require('express');
const router = express.Router();
const { 
  getAllEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee 
} = require('../controllers/employeeController');
const { validateEmployee } = require('../middleware/validation');
const { cacheMiddleware, clearCache } = require('../middleware/cache');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Get all employees (public read – kiosk and admin both need this)
router.get('/', getAllEmployees);

// Get single employee by ID
router.get('/:id', getEmployeeById);

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

// Delete employee — admin only (clears cache)
router.delete('/:id', verifyAdminToken, (req, res, next) => {
  clearCache('employees');
  next();
}, deleteEmployee);

module.exports = router;
