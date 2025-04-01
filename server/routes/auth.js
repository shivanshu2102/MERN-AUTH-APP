const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth'); // Import matches export

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
  
      // Handle file path
      let profileImagePath = '';
      if (req.file) {
        profileImagePath = req.file.path.replace(/\\/g, '/'); // Convert to forward slashes
      }
  
      // Create new user
      const user = new User({
        name,
        username,
        password: hashedPassword,
        profileImage: profileImagePath,
        hobbies: Array.isArray(hobbies) ? hobbies : [hobbies].filter(Boolean)
      });
  
      await user.save();
  
      // Create token
      const token = jwt.sign(
        { user: { id: user._id } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
  
      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage
        }
      });
    } catch (error) {
      console.error('Signup Error:', error);
      
      // Clean up uploaded file if error occurred
      if (req.file) {
        fs.unlink(req.file.path, err => {
          if (err) console.error('Error deleting file:', err);
        });
      }
  
      res.status(500).json({
        success: false,
        message: 'Server error during signup',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
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
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

module.exports = router;