const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configuration for CNIC uploads (matches your existing auth routes)
const cnicStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hostelhub/users/cnic',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: { width: 800, height: 800, crop: 'fill' },
    format: 'jpg',
    quality: 80
  }
});

// Configuration for Property uploads (matches your hostel management)
const propertyStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hostelhub/properties',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    resource_type: 'image'
  }
});

// Configuration for User Profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hostelhub/users/profile',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: { width: 500, height: 500, crop: 'thumb', gravity: 'face' },
    format: 'jpg'
  }
});

// Add this to your existing cloudinary config
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

module.exports = {
  cloudinary,
  cnicStorage,
  propertyStorage,
  profileStorage,
  deleteFromCloudinary
};