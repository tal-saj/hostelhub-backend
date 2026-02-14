const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String },
    dob: { type: Date },
    cnic: { type: String },
    cnicFrontImage: { type: String },
    cnicBackImage: { type: String },

    // Payment Plan Details
    paymentPlan: {
      type: {
        planType: { type: String, enum: ['monthly', 'yearly'], required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true }, // To indicate if the plan is active or cancelled
      },
      default: null, // Initially no payment plan is associated
    },

    // Hostel Details
    hostelName: { type: String, default: null }, // Hostel name
    hostelAddress: { type: String, default: null }, // Hostel address
    hostelCity: { type: String, default: null }, // City where the hostel is located
    hostelCategory: { 
      type: String, 
      enum: ['boys', 'girls', 'apartment'], 
      default: null, 
    }, // Type of hostel
    amenities: { type: [String], default: [] }, // Array of amenities
    hostelFrontImage: { type: String, default: null }, // Front image of the hostel
    messImage: { type: String, default: null }, // Mess image
    room1Image: { type: String, default: null }, // Image of room 1
    room2Image: { type: String, default: null }, // Image of room 2
    room3Image: { type: String, default: null }, // Image of room 3
    hostelPrice: { type: Number, default: null }, // Hostel price

    // User status (approved, rejected, or pending)
    status: { 
      type: String, 
      enum: ['approved', 'rejected', 'pending'], 
      default: 'pending' // Default status is 'pending'
    },reviews: [
    {
      rating: { type: Number, required: true },
      review: { type: String, required: true },
      name: String,
      email: String,
      date: String
    }
  ],
  averageRating: {
    type: Number,
    default: 0
  },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
