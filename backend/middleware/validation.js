const { body, validationResult } = require('express-validator');

const validateEmployee = [
  body('name')
    .trim()
    .escape()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('role')
    .trim()
    .escape()
    .notEmpty().withMessage('Role is required')
    .isLength({ min: 1, max: 50 }).withMessage('Role must be between 1 and 50 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateAdminLogin = [
  body('username')
    .trim()
    .escape()
    .notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateAttendance = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .custom((value) => {
      // Accept numeric IDs (from admin tools) OR name strings (from kiosk)
      if (typeof value === 'number') return true;
      if (typeof value === 'string' && value.trim().length > 0) return true;
      throw new Error('User ID must be a valid ID or employee name');
    }),
  body('status')
    .trim()
    .isIn(['IN', 'OUT']).withMessage('Status must be either IN or OUT'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];


module.exports = {
  validateEmployee,
  validateAdminLogin,
  validateAttendance
};
