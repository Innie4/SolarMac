const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user.model');
const { auth, checkRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Register new user
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already registered'
        });
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName
      });

      await user.save();

      // Generate token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        status: 'success',
        data: {
          user: user.getPublicProfile(),
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error creating user'
      });
    }
  }
);

// Login user
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        status: 'success',
        data: {
          user: user.getPublicProfile(),
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error logging in'
      });
    }
  }
);

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching profile'
    });
  }
});

// Update user profile
router.patch('/profile', auth,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updates = Object.keys(req.body);
      const allowedUpdates = ['firstName', 'lastName', 'email'];
      const isValidOperation = updates.every(update => allowedUpdates.includes(update));

      if (!isValidOperation) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid updates'
        });
      }

      updates.forEach(update => req.user[update] = req.body[update]);
      await req.user.save();

      res.json({
        status: 'success',
        data: {
          user: req.user.getPublicProfile()
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error updating profile'
      });
    }
  }
);

// Change password
router.post('/change-password', auth,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isMatch = await req.user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Current password is incorrect'
        });
      }

      // Update password
      req.user.password = newPassword;
      await req.user.save();

      res.json({
        status: 'success',
        message: 'Password updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error changing password'
      });
    }
  }
);

// Admin: Get all users
router.get('/users', auth, checkRole('admin'), async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({
      status: 'success',
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users'
    });
  }
});

// Admin: Update user role
router.patch('/users/:id/role', auth, checkRole('admin'),
  [
    body('role').isIn(['admin', 'editor', 'viewer'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      user.role = req.body.role;
      await user.save();

      res.json({
        status: 'success',
        data: {
          user: user.getPublicProfile()
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error updating user role'
      });
    }
  }
);

module.exports = router; 