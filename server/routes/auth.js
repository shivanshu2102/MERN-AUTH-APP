const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');


router.post('/signup', upload.single('profile'), async (req, res) => {
  try {
    const { name, username, password, hobbies } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, username and password are required'
      });
    }

    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists (case insensitive check)'
      });
    }

    // Changed to use filename instead of path
    const user = new User({
      name,
      username: username.toLowerCase(),
      password,
      profileImage: req.file?.filename || '', // 👈 Changed here
      hobbies: Array.isArray(hobbies) ? hobbies : [hobbies].filter(Boolean)
    });

    await user.save();

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const userData = user.toObject();
    delete userData.password;

    return res.status(201).json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('Signup error:', error);
    
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


router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).select('+password');

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
    const user = await User.findById(req.user.id).select('-password');
    
    // Clean path for Windows/Linux compatibility
    const cleanProfileImage = user.profileImage 
      ? `/uploads/${user.profileImage.replace(/\\/g, '/')}`
      : null;

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        profileImage: cleanProfileImage
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
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


router.put('/profile', protect, upload.single('profile'), async (req, res) => {
  try {
    const { name, hobbies } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (hobbies) updates.hobbies = Array.isArray(hobbies) ? hobbies : [hobbies].filter(Boolean);
    if (req.file) updates.profileImage = req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    //////// Clean path for Windows/Linux compatibility
    const userResponse = updatedUser.toObject();
    if (userResponse.profileImage) {
      userResponse.profileImage = `/uploads/${userResponse.profileImage.replace(/\\/g, '/')}`;
    }
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