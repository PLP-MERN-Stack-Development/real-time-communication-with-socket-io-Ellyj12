const jwt = require('jsonwebtoken');

// This function creates a signed JWT
// It takes the user's database ID as the payload
const generateToken = (id) => {
  // We sign the token with our secret (from .env)
  // and set it to expire in 30 days.
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = generateToken;
