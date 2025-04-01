const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/signup
router.post('/signup', upload.single('profile'), async (req, res) => {
  try {
    const { name, username, password, hobbies } = req.body;

    // Validate required fields
    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, username and password are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name,
      username,
      password: hashedPassword,
      profileImage: req.file?.path || '',
      hobbies: Array.isArray(hobbies) ? hobbies : [hobbies].filter(Boolean)
    });

    await user.save();

    // Create token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return response without password
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res.status(201).json({
      success: true,
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Clean up uploaded file if error occurred
    if (req.file) {
      const fs = require('fs');
      fs.unlink(req.file.path, err => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(500).json({
      success: false,
      message: 'Signup failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user with password explicitly selected
    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
      console.log('Login attempt for non-existent user:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare passwords
    console.log('Comparing password for user:', username);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Prepare user data without password
    const userData = user.toObject();
    delete userData.password;

    res.json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/auth/profile
router.get('/profile', protect, async (req, res) => {
  try {
    // User is already attached to req by protect middleware
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

module.exports = router;