const Admin = require('../models/Admin');
const User = require('../models/User');

// Admin Login
const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if the password matches
    if (admin.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return success message and basic token-like response (no JWT for simplicity)
    res.json({ message: 'Login successful', token: 'admin-token' });

  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fetch all users for Admin Dashboard
const getAllUsers = async (req, res) => {
    try {
      // Fetch all users, including their status and other details
      const users = await User.find({});
      const usersData = users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,  // Display user status
        address: user.address,
        dob: user.dob,
        cnic: user.cnic,
        paymentPlan: user.paymentPlan,
        hostelName: user.hostelName,
        hostelAddress: user.hostelAddress,
        hostelPrice: user.hostelPrice,
        // Add any other fields that should be displayed in the dashboard
      }));
      res.status(200).json({ users: usersData });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error });
    }
  };
  
// Update user status (approve/reject)
const updateUserStatus = async (req, res) => {
    const { userId, status } = req.body;
  
    // Check if the status is valid
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      // Update user status
      user.status = status;
      await user.save();
  
      res.status(200).json({ message: `User ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'status updated'}` });
    } catch (error) {
      res.status(500).json({ message: 'Error updating user status', error });
    }
  };

  // Update user status (v2 version)
const updateUserStatusV2 = async (req, res) => {
    const { userId, status } = req.body;
  
    try {
      // Validate status
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
  
      // Find the user and update the status
      const user = await User.findByIdAndUpdate(userId, { status }, { new: true });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({ message: `User status updated to ${status}`, user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating user status', error });
    }
  };

module.exports = { adminLogin, getAllUsers, updateUserStatus,updateUserStatusV2 };
