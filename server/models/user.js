const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  profileImage: String,
  hobbies: [String]
});

// Enhanced pre-save hook for bcryptjs 3.x
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    // Using bcryptjs's recommended salt rounds (10)
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
    next();
  } catch (err) {
    console.error('Hashing error:', err);
    next(new Error('Password hashing failed'));
  }
});

// Bulletproof password comparison
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Trim whitespace and ensure string type
    const cleanCandidate = String(candidatePassword).trim();
    return await bcrypt.compare(cleanCandidate, this.password);
  } catch (err) {
    console.error('Comparison error:', err);
    return false;
  }
};

module.exports = mongoose.model('User', UserSchema);