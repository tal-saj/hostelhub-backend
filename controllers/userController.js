const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { deleteFromCloudinary } = require('../utils/cloudinary');

// Helper function to clean up uploaded files on error
async function cleanupUploads(files) {
  if (!files) return;
  
  const deletePromises = [];
  
  Object.values(files).forEach(fileArray => {
    if (fileArray && fileArray[0]) {
      const urlParts = fileArray[0].path.split('/');
      const publicId = `hostelhub/properties/${urlParts[urlParts.length - 1].split('.')[0]}`;
      deletePromises.push(deleteFromCloudinary(publicId));
    }
  });

  await Promise.all(deletePromises);
}

// Helper function to delete existing hostel images
async function deleteExistingHostelImages(user) {
  const deletePromises = [];
  
  const imageFields = [
    'hostelFrontImage',
    'messImage',
    'room1Image',
    'room2Image',
    'room3Image'
  ];

  imageFields.forEach(field => {
    if (user[field]) {
      const urlParts = user[field].split('/');
      const publicId = `hostelhub/properties/${urlParts[urlParts.length - 1].split('.')[0]}`;
      deletePromises.push(deleteFromCloudinary(publicId));
    }
  });

  await Promise.all(deletePromises);
}

// User Registration
const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'Email or phone already in use' 
      });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ 
      name, 
      email, 
      phone, 
      password: hashedPassword 
    });

    await newUser.save();

    res.status(201).json({ 
      success: true,
      message: 'User registered successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// User Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET_KEY, 
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const { address, dob, cnic } = req.body;
    const user = req.user;

    // Update fields if provided
    if (address) user.address = address;
    if (dob) user.dob = dob;
    if (cnic) user.cnic = cnic;

    // Handle file uploads
    if (req.files) {
      if (req.files.cnicFrontImage) {
        user.cnicFrontImage = req.files.cnicFrontImage[0].path;
      }
      if (req.files.cnicBackImage) {
        user.cnicBackImage = req.files.cnicBackImage[0].path;
      }
    }

    await user.save();

    res.status(200).json({ 
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        dob: user.dob
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Payment Plan Controller
const paymentPlanController = {
  subscribePlan: async (req, res) => {
    try {
      const { type } = req.body;
      const userId = req.user._id;

      if (!['monthly', 'yearly'].includes(type)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid payment type' 
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      if (user.paymentPlan?.isActive) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active payment plan'
        });
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      type === 'monthly' 
        ? endDate.setMonth(endDate.getMonth() + 1)
        : endDate.setFullYear(endDate.getFullYear() + 1);

      user.paymentPlan = {
        planType: type,
        startDate,
        endDate,
        isActive: true,
      };

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Payment plan subscribed successfully',
        paymentPlan: user.paymentPlan
      });
    } catch (error) {
      console.error('Subscribe plan error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error subscribing to payment plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  cancelPlan: async (req, res) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      if (!user.paymentPlan?.isActive) {
        return res.status(400).json({ 
          success: false,
          message: 'No active payment plan to cancel' 
        });
      }

      user.paymentPlan.isActive = false;
      user.paymentPlan.endDate = new Date();
      await user.save();

      res.status(200).json({ 
        success: true,
        message: 'Payment plan cancelled successfully' 
      });
    } catch (error) {
      console.error('Cancel plan error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error cancelling payment plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  getUserPaymentPlan: async (req, res) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      res.status(200).json({
        success: true,
        paymentPlan: user.paymentPlan || null
      });
    } catch (error) {
      console.error('Get payment plan error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error retrieving payment plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Delete User Account
const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Delete associated images from Cloudinary
    const deletePromises = [];
    const imageFields = [
      'cnicFrontImage', 'cnicBackImage',
      'hostelFrontImage', 'messImage',
      'room1Image', 'room2Image', 'room3Image'
    ];

    imageFields.forEach(field => {
      if (user[field]) {
        const urlParts = user[field].split('/');
        const publicId = `hostelhub/${urlParts[urlParts.length - 1].split('.')[0]}`;
        deletePromises.push(deleteFromCloudinary(publicId));
      }
    });

    await Promise.all(deletePromises);
    await user.deleteOne();

    res.status(200).json({ 
      success: true,
      message: 'User account deleted successfully' 
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting user account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Manage Property (Add/Update Hostel)
const manageProperty = async (req, res) => {
  try {
    const {
      hostelName,
      hostelAddress,
      hostelCity,
      hostelCategory,
      amenities,
      hostelPrice
    } = req.body;

    const userId = req.user._id;

    // Validate required fields
    const requiredFields = {
      hostelName,
      hostelAddress,
      hostelCity,
      hostelCategory,
      hostelPrice
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      // Cleanup any uploaded files if validation fails
      if (req.files) await cleanupUploads(req.files);
      
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }

    // Validate at least front image is uploaded
    if (!req.files?.frontImage) {
      return res.status(400).json({
        success: false,
        message: 'Front image is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      if (req.files) await cleanupUploads(req.files);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Delete existing images if they exist
    if (user.hostelFrontImage) {
      await deleteExistingHostelImages(user);
    }

    // Prepare hostel data with image URLs
    const hostelData = {
      hostelName,
      hostelAddress,
      hostelCity,
      hostelCategory,
      hostelPrice: Number(hostelPrice),
      amenities: amenities 
        ? amenities.split(',').map(item => item.trim()).filter(Boolean)
        : [],
      status: 'pending'
    };

    // Add image URLs to hostel data
    if (req.files) {
      if (req.files.frontImage) hostelData.hostelFrontImage = req.files.frontImage[0].path;
      if (req.files.messImage) hostelData.messImage = req.files.messImage[0].path;
      if (req.files.room1Image) hostelData.room1Image = req.files.room1Image[0].path;
      if (req.files.room2Image) hostelData.room2Image = req.files.room2Image[0].path;
      if (req.files.room3Image) hostelData.room3Image = req.files.room3Image[0].path;
    }

    // Update user with hostel data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      hostelData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Hostel information saved successfully',
      hostel: {
        name: updatedUser.hostelName,
        address: updatedUser.hostelAddress,
        city: updatedUser.hostelCity,
        images: {
          front: updatedUser.hostelFrontImage,
          mess: updatedUser.messImage,
          room1: updatedUser.room1Image,
          room2: updatedUser.room2Image,
          room3: updatedUser.room3Image
        }
      }
    });

  } catch (error) {
    console.error('Manage property error:', error);

    // Cleanup uploaded files if error occurred
    if (req.files) await cleanupUploads(req.files);

    let status = 500;
    let message = 'Error saving hostel information';

    if (error.name === 'ValidationError') {
      status = 400;
      message = 'Validation failed';
    } else if (error.message.includes('File too large')) {
      status = 413;
      message = 'Image files must be less than 2MB each';
    } else if (error.message.includes('not allowed')) {
      status = 400;
      message = 'Only JPEG, JPG, or PNG images are allowed';
    }

    res.status(status).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// View User's Hostels
const viewHostels = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .select('hostelName hostelAddress hostelCity hostelCategory amenities hostelFrontImage messImage room1Image room2Image room3Image hostelPrice status rejectionReason');

    if (!user.hostelName) {
      return res.status(404).json({ 
        success: false,
        message: 'No hostel registered for this user' 
      });
    }

    res.status(200).json({
      success: true,
      hostel: user
    });
  } catch (error) {
    console.error('View hostels error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving hostel details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete Hostel
const deleteHostel = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.hostelName) {
      return res.status(400).json({ 
        success: false,
        message: 'No hostel details to delete' 
      });
    }

    // Delete images from Cloudinary
    await deleteExistingHostelImages(user);

    // Clear hostel details
    const updateData = {
      hostelName: null,
      hostelAddress: null,
      hostelCity: null,
      hostelCategory: null,
      amenities: [],
      hostelPrice: null,
      hostelFrontImage: null,
      messImage: null,
      room1Image: null,
      room2Image: null,
      room3Image: null,
      status: null,
      rejectionReason: null
    };

    await User.findByIdAndUpdate(userId, updateData);
    
    res.status(200).json({ 
      success: true,
      message: 'Hostel deleted successfully' 
    });
  } catch (error) {
    console.error('Delete hostel error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting hostel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// View All Approved Hostels
const viewAllHostels = async (req, res) => {
  try {
    const hostels = await User.find({ 
      hostelName: { $ne: null },
      status: 'approved'
    }).select('hostelName hostelCity hostelAddress hostelFrontImage hostelCategory hostelPrice _id');

    res.status(200).json({
      success: true,
      count: hostels.length,
      hostels
    });
  } catch (error) {
    console.error('View all hostels error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching hostels',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Hostel Details
const getHostelDetails = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const hostel = await User.findOne({ 
      _id: hostelId, 
      status: 'approved',
      hostelName: { $ne: null }
    }).select('hostelName hostelCity hostelAddress hostelCategory amenities hostelPrice hostelFrontImage messImage room1Image room2Image room3Image phone name');

    if (!hostel) {
      return res.status(404).json({ 
        success: false,
        message: 'Hostel not found or not approved' 
      });
    }

    res.status(200).json({
      success: true,
      hostel
    });
  } catch (error) {
    console.error('Get hostel details error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching hostel details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get All Cities with Approved Hostels
const getAllCities = async (req, res) => {
  try {
    const cities = await User.distinct('hostelCity', { 
      status: 'approved',
      hostelCity: { $ne: null }
    });

    res.status(200).json({
      success: true,
      count: cities.length,
      cities
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching cities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Hostels by City
const getHostelsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const hostels = await User.find({ 
      hostelCity: city, 
      status: 'approved'
    }).select('hostelName hostelPrice hostelCity hostelAddress hostelFrontImage hostelCategory _id');

    if (hostels.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: `No approved hostels found in ${city}` 
      });
    }

    res.status(200).json({
      success: true,
      count: hostels.length,
      hostels
    });
  } catch (error) {
    console.error('Get hostels by city error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching hostels by city',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get All Categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await User.distinct('hostelCategory', { 
      status: 'approved',
      hostelCategory: { $ne: null }
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Hostels by Category
const getHostelsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const hostels = await User.find({ 
      hostelCategory: category,
      status: 'approved'
    }).select('hostelName hostelCity hostelAddress hostelFrontImage hostelCategory hostelprice _id');

    if (hostels.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: `No hostels found in category ${category}` 
      });
    }

    res.status(200).json({
      success: true,
      count: hostels.length,
      hostels
    });
  } catch (error) {
    console.error('Get hostels by category error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching hostels by category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const getReviewsByHostel = async (req, res) => {
  const { hostelId } = req.params;

  try {
    // Find the user/hostel by ID and select only the reviews array
    const user = await User.findById(hostelId).select('reviews');

    if (!user) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    res.status(200).json({ reviews: user.reviews });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  updateUserProfile,
  paymentPlanController,
  deleteUserAccount,
  manageProperty,
  viewHostels,
  deleteHostel,
  viewAllHostels,
  getHostelDetails,
  getAllCities,
  getHostelsByCity,
  getHostelsByCategory,
  getAllCategories,
  getReviewsByHostel
};