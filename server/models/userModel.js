const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// --- USER SCHEMA ---
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: [true, 'Username already taken'], // Ensures no duplicate usernames
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
  },
  { timestamps: true }
); // Adds createdAt and updatedAt fields

// --- PRE-SAVE HOOK ---
// This runs before a new user is saved
UserSchema.pre('save', async function (next) {
  // 'this' refers to the user document being saved
  if (!this.isModified('password')) {
    return next(); // If password wasn't changed, skip hashing
  }

  // Generate a "salt" and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// --- HELPER METHOD ---
// We add a custom method to our User model to easily compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // 'this.password' is the hashed password from the database
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create and export the model
const User = mongoose.model('User', UserSchema);
module.exports = User;
