const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://211360:pakistan@hostelhub0.dyxkxkx.mongodb.net/?retryWrites=true&w=majority&appName=Hostelhub0/hostelhubpro', {
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ username: 'admin' });

    if (existingAdmin) {
      console.log('Admin already exists!');
      return;
    }

    const newAdmin = new Admin({
      username: 'admin',
      password: '123', // This can be changed to whatever you want
    });

    await newAdmin.save();
    console.log('Admin seeded successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

connectDB();
seedAdmin();
