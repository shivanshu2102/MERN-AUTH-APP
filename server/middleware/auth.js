const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  
  const token = req.header('x-auth-token');

  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'No token, authorization denied' 
    });
  }

  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    
    req.user = await User.findById(decoded.user.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    next();
  } catch (err) {
    console.error('JWT Error:', err.message);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

module.exports = {
  protect
};