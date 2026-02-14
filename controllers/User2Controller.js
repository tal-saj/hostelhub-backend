const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User2 = require('../models/User2'); // Regular user model (reviewers)
const User = require('../models/User');   // Hostel owner model

// Register user
const signup2 = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User2.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User2({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Login user
const login2 = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User2.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token, user });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Add review to a hostel
const addReviewToHostel = async (req, res) => {
  const { hostelId, rating, review } = req.body;

  try {
    if (!rating || !review || !hostelId) {
      return res.status(400).json({ message: 'Hostel ID, rating and review are required' });
    }

    const hostelOwner = await User.findById(hostelId);
    if (!hostelOwner) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    const reviewer = req.user; // ✅ comes from verifyToken2 middleware
    if (!reviewer) {
      return res.status(403).json({ message: 'Unauthorized reviewer' });
    }

    const newReview = {
      rating: Number(rating),
      review,
      name: reviewer.name,
      email: reviewer.email,
      date: new Date().toISOString(),
    };

    hostelOwner.reviews.push(newReview);

    hostelOwner.averageRating =
      hostelOwner.reviews.reduce((sum, r) => sum + r.rating, 0) / hostelOwner.reviews.length;

    await hostelOwner.save();

    res.status(201).json({ message: 'Review submitted successfully', review: newReview });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Failed to submit review', error: error.message });
  }
};

module.exports = { signup2, login2, addReviewToHostel };
