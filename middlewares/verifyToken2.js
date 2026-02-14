const jwt = require('jsonwebtoken');
const User2 = require('../models/User2'); // Reviewer model

const verifyToken2 = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User2.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user; // Attach the reviewer (User2) data to the request
    next(); // Continue to the next middleware or route
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired, please login again' });
    }

    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

module.exports = verifyToken2;
