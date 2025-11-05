const express = require('express');
const router = express.Router();
const User = require('../models/userModel'); 
const generateToken = require('../utils/generateToken');


router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

  
    const user = await User.create({
      username,
      password,
    });


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


router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

  
    const user = await User.findOne({ username });

 
    if (user && (await user.matchPassword(password))) {
     
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
