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

// Get all employees (cached)
router.get('/', cacheMiddleware('employees'), getAllEmployees);

// Get single employee by ID
router.get('/:id', getEmployeeById);

// Create new employee (clears cache)
router.post('/', validateEmployee, (req, res, next) => {
  clearCache('employees');
  next();
}, createEmployee);

// Update employee (clears cache)
router.put('/:id', validateEmployee, (req, res, next) => {
  clearCache('employees');
  next();
}, updateEmployee);

// Delete employee (clears cache)
router.delete('/:id', (req, res, next) => {
  clearCache('employees');
  next();
}, deleteEmployee);

module.exports = router;
