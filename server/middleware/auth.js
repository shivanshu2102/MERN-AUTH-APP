const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');


const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadPath = path.join(__dirname, '../uploads');
      // ...
    },
    filename: function(req, file, cb) {
      // Ensure clean filename without path
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `profile-${uniqueSuffix}${ext}`); // 👈 No path in filename
    }
  });


const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, JPG, and PNG images are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


const deleteOldImage = async (req, res, next) => {
    if (req.file && req.user?.profileImage) {
        const oldImagePath = path.join(__dirname, '../', req.user.profileImage);
        if (fs.existsSync(oldImagePath)) {
            fs.unlink(oldImagePath, (err) => {
                if (err) console.error('Error deleting old image:', err);
            });
        }
    }
    next();
};

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

module.exports = { upload, deleteOldImage, protect };
