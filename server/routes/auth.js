const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
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

    // Case-insensitive username check
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists (case insensitive check)'
      });
    }

    // Create new user
    const user = new User({
      name,
      username: username.toLowerCase(), // Store as lowercase for consistency
      password, // Will be hashed by pre-save hook
      profileImage: req.file?.path || '',
      hobbies: Array.isArray(hobbies) ? hobbies : [hobbies].filter(Boolean)
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    return res.status(201).json({
      success: true,
      token,
      user: userData
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

    return res.status(500).json({
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

    // Case-insensitive login
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    
    const userData = user.toObject();
    delete userData.password;

    return res.json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});


router.get('/profile', protect, async (req, res) => {
  try {
    
    return res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});


router.get('/debug-user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${req.params.username}$`, 'i') }
    }).select('+password');
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      username: user.username,
      passwordHash: user.password,
      createdAt: user.createdAt
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
// @route   PUT /api/auth/profile
router.put('/profile', protect, upload.single('profile'), async (req, res) => {
  try {
    const { name, hobbies } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (hobbies) updates.hobbies = Array.isArray(hobbies) ? hobbies : [hobbies].filter(Boolean);
    if (req.file) updates.profileImage = req.file.path;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;