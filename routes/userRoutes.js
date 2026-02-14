const express = require('express');
const multer = require('multer');
const { cnicStorage, propertyStorage, deleteFromCloudinary } = require('../utils/cloudinary');
const verifyToken = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');
const {
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
  getAllCategories,
  getHostelsByCategory,
  getReviewsByHostel  
} = require('../controllers/userController');

const router = express.Router();

// Configure multer instances
const uploadCNIC = multer({ 
  storage: cnicStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024,
    files: 2
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/image\/(jpeg|jpg|png)/)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG/JPG/PNG images allowed'), false);
    }
  }
}).fields([
  { name: 'cnicFront', maxCount: 1 },
  { name: 'cnicBack', maxCount: 1 }
]);

const uploadProperty = multer({ 
  storage: propertyStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024,
    files: 5,
    fieldSize: 20 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/image\/(jpeg|jpg|png)/)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG/JPG/PNG images allowed'), false);
    }
  }
}).fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'messImage', maxCount: 1 },
  { name: 'room1Image', maxCount: 1 },
  { name: 'room2Image', maxCount: 1 },
  { name: 'room3Image', maxCount: 1 }
]);

// Middleware for JSON parsing
router.use(express.json({ limit: '20mb' }));
router.use(express.urlencoded({ limit: '20mb', extended: true }));

// ========== AUTHENTICATION ROUTES ==========
router.post('/signup', registerUser);
router.post('/login', loginUser);

// ========== USER PROFILE ROUTES ==========
router.put('/update-profile', verifyToken, (req, res, next) => {
  uploadCNIC(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file type'
      });
    }
    next();
  });
}, updateUserProfile);


// ========== PAYMENT PLAN ROUTES ==========
router.post('/payment-plan/subscribe', verifyToken, paymentPlanController.subscribePlan);
router.post('/payment-plan/cancel', verifyToken, paymentPlanController.cancelPlan);
router.get('/payment-plan/details', verifyToken, paymentPlanController.getUserPaymentPlan);

// ========== PROPERTY MANAGEMENT ROUTES ==========
router.post('/manage-property', verifyToken, (req, res, next) => {
  req.setTimeout(60000, () => {
    return res.status(408).json({
      success: false,
      message: 'Request timeout. Please try again with smaller files or better connection.'
    });
  });

  uploadProperty(req, res, async (err) => {
    try {
      if (err) {
        // Cleanup uploaded files if error occurs
        if (req.files) {
          await Promise.all(
            Object.values(req.files).map(fileArray => {
              if (fileArray?.[0]?.path) {
                const urlParts = fileArray[0].path.split('/');
                const publicId = `hostelhub/properties/${urlParts[urlParts.length - 1].split('.')[0]}`;
                return deleteFromCloudinary(publicId);
              }
              return Promise.resolve();
            })
          );
        }

        if (err instanceof multer.MulterError) {
          let message = 'File upload error';
          if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File size too large. Maximum 2MB per image allowed.';
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            message = 'Too many files uploaded. Maximum 5 images allowed.';
          }
          return res.status(400).json({
            success: false,
            message,
            errorType: 'UPLOAD_ERROR'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file upload'
        });
      }

      // Validate required front image
      if (!req.files?.frontImage) {
        return res.status(400).json({
          success: false,
          message: 'Front image is required'
        });
      }

      // Validate file types
      const validFiles = Object.values(req.files).every(fileArray => 
        fileArray?.[0]?.mimetype?.match(/image\/(jpeg|jpg|png)/)
      );

      if (!validFiles) {
        await Promise.all(
          Object.values(req.files).map(fileArray => {
            if (fileArray?.[0]?.path) {
              const urlParts = fileArray[0].path.split('/');
              const publicId = `hostelhub/properties/${urlParts[urlParts.length - 1].split('.')[0]}`;
              return deleteFromCloudinary(publicId);
            }
            return Promise.resolve();
          })
        );
        return res.status(400).json({
          success: false,
          message: 'Only JPEG, JPG, or PNG images are allowed'
        });
      }

      next();
    } catch (error) {
      console.error('File upload processing error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing file upload'
      });
    }
  });
}, manageProperty);

// ========== HOSTEL MANAGEMENT ROUTES ==========
router.get('/view-hostels', verifyToken, viewHostels);
router.delete('/delete-hostel/:hostelId', verifyToken, deleteHostel);

// ========== PUBLIC HOSTEL ROUTES ==========
router.get('/view-all-hostels', viewAllHostels);
router.get('/hostel-details/:hostelId', getHostelDetails);
router.get('/cities', getAllCities);
router.get('/hostels/city/:city', getHostelsByCity);
router.get('/categories', getAllCategories);
router.get('/hostels-by-category/:category', getHostelsByCategory);

// ========== ADMIN ROUTES ==========
router.patch('/approve-hostel/:hostelId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const { hostelId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "approved" or "rejected"'
      });
    }

    const updateData = { 
      status,
      ...(status === 'rejected' && rejectionReason && { rejectionReason })
    };

    const updatedUser = await User.findByIdAndUpdate(
      hostelId,
      updateData,
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: `Hostel ${status} successfully`,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating hostel status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating hostel status'
    });
  }
});

// ========== DOCUMENT UPLOAD ROUTES ==========
router.post('/upload-cnic', verifyToken, (req, res, next) => {
  uploadCNIC(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file type'
      });
    }
    
    if (!req.files?.cnicFront?.[0] || !req.files?.cnicBack?.[0]) {
      return res.status(400).json({
        success: false,
        message: 'Both CNIC front and back images are required'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        cnicFrontImage: req.files.cnicFront[0].path,
        cnicBackImage: req.files.cnicBack[0].path,
        verificationStatus: 'pending'
      },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'CNIC uploaded successfully',
      data: {
        cnicFrontUrl: updatedUser.cnicFrontImage,
        cnicBackUrl: updatedUser.cnicBackImage
      }
    });
  } catch (error) {
    console.error('CNIC upload processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process CNIC upload'
    });
  }
});

// ========== HOSTEL OWNER ROUTES ==========
router.get('/my-hostel', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('hostelName hostelAddress hostelCity hostelCategory amenities hostelFrontImage messImage room1Image room2Image room3Image hostelPrice status rejectionReason');
    
    if (!user.hostelName) {
      return res.status(404).json({
        success: false,
        message: 'No hostel registered for this user'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        images: {
          front: user.hostelFrontImage,
          mess: user.messImage,
          room1: user.room1Image,
          room2: user.room2Image,
          room3: user.room3Image
        }
      }
    });
  } catch (error) {
    console.error('Error fetching hostel information:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hostel information'
    });
  }
});

// ========== ACCOUNT MANAGEMENT ==========
router.delete('/account', verifyToken, deleteUserAccount);

// ========== REVIEW ROUTE ==========
router.get('/reviews/:hostelId', getReviewsByHostel);

module.exports = router;