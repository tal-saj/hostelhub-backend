const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Hostel Owner model

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Extract token from 'Bearer <token>'

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user; // Attach user (hostel owner) to request object
    next(); // Proceed to the next middleware or controller
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired, please login again' });
    }

    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

module.exports = verifyToken;
