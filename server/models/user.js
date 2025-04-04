const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  profileImage: { type: String, default: '' },
  hobbies: { type: [String], default: [] }
}, { timestamps: true }); 


UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
    next();
  } catch (err) {
    console.error('Hashing error:', err);
    next(new Error('Password hashing failed'));
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    
    const cleanCandidate = String(candidatePassword).trim();
    return await bcrypt.compare(cleanCandidate, this.password);
  } catch (err) {
    console.error('Comparison error:', err);
    return false;
  }
};

module.exports = mongoose.model('User', UserSchema);