const express = require('express');
const router = express.Router();
const User = require('../models/userModel'); // Import our User model
const generateToken = require('../utils/generateToken'); // Import our token generator

// --- @route   POST /api/auth/register ---
// --- @desc    Register a new user ---
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // 2. Create new user
    // Our pre-save hook in User.js will automatically hash the password
    const user = await User.create({
      username,
      password,
    });

    // 3. If user created, send back user data and a token
    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- @route   POST /api/auth/login ---
// --- @desc    Authenticate user & get token ---
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Find user by username
    const user = await User.findOne({ username });

    // 2. Check if user exists AND if password matches
    // We use the custom 'matchPassword' method we created in User.js
    if (user && (await user.matchPassword(password))) {
      // 3. Send back user data and a token
      res.json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
