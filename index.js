require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs'); // Added missing fs module import

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const user2Routes = require('./routes/user2Routes');

// Initialize Express app
const app = express();

// Enhanced CORS configuration
const allowedOrigins = [
  
  'https://hostelhub-frontend-tau.vercel.app/',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Exact match only for security
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      // Send false to reject without throwing error, Express will send 403
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Optional: handle CORS errors explicitly (if needed)
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({ message: 'CORS Error: Access denied' });
  }
  next(err);
});


// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware with increased payload limits for file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Configuration
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hostelhub';

// Enhanced serverless-optimized connection caching
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    console.log('🚀 Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority'
    };

    console.log('🔌 Establishing new MongoDB connection');
    cached.promise = mongoose.connect(MONGODB_URI, options)
      .then(mongoose => {
        console.log('✅ MongoDB connected successfully');
        return mongoose;
      })
      .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
};

// Enhanced database connection middleware with retry logic
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err);
    res.status(503).json({
      status: 'error',
      code: 'DATABASE_UNAVAILABLE',
      message: 'Service unavailable - Database connection failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.error(`Request timeout for ${req.method} ${req.originalUrl}`);
  });
  res.setTimeout(30000);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Ensure uploads directory exists
if (process.env.NODE_ENV !== 'production') {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// Configure your static files middleware
if (process.env.NODE_ENV === 'production') {
  // Production - Cloudinary only
  app.use('/uploads', (req, res, next) => {
    try {
      res.status(403).json({ 
        status: 'error',
        code: 'CLOUD_STORAGE_REQUIRED',
        message: 'File access not allowed in production - use Cloudinary storage',
        documentation: 'https://cloudinary.com/documentation'
      });
    } catch (err) {
      console.error('Error handling /uploads route:', err);
      next(err);
    }
  });
} else {
  // Development - local file handling with proper error checking
  const uploadsDir = path.join(__dirname, 'uploads');
  
  // Check if uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.warn('Uploads directory does not exist. Creating...');
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Uploads directory created successfully');
    } catch (err) {
      console.error('Failed to create uploads directory:', err);
      process.exit(1); // Exit if we can't create the directory
    }
  }

  // Serve static files with error handling
  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      try {
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      } catch (err) {
        console.error('Error setting cache headers:', err);
      }
    },
    fallthrough: false // Don't fall through to next middleware if file not found
  }));

  // Error handler for static files
  app.use('/uploads', (err, req, res, next) => {
    console.error('Static file error:', err);
    res.status(err.status || 500).json({
      status: 'error',
      code: 'STATIC_FILE_ERROR',
      message: 'Error serving static file',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });
}

// API Routes with consistent versioning
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/user2', user2Routes);

// Remove duplicate route mounting (was present in original code)
// app.use('/api', require('./routes/userRoutes')); // This line is removed

// Enhanced health check endpoint
app.get('/api/v1/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    },
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Test database connection
    await mongoose.connection.db.admin().ping();
    healthCheck.database.collections = (await mongoose.connection.db.listCollections().toArray()).length;
    
    // Test filesystem access
    try {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      healthCheck.filesystem = 'writable';
    } catch (fsErr) {
      healthCheck.filesystem = 'readonly';
      healthCheck.status = 'degraded';
    }

    res.json(healthCheck);
  } catch (err) {
    healthCheck.status = 'unhealthy';
    healthCheck.error = err.message;
    res.status(503).json(healthCheck);
  }
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'HostelHub Backend API',
    version: '1.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    documentation: 'https://github.com/Tallal-Dev/hostelhub-backend',
    endpoints: {
      users: '/api/v1/users',
      admin: '/api/v1/admin',
      health: '/api/v1/health'
    },
    cors: {
      allowedOrigins: allowedOrigins,
      methods: corsOptions.methods
    }
  });
});

// Route not found handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    code: 'ENDPOINT_NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    suggestions: [
      '/api/v1/users',
      '/api/v1/admin',
      '/api/v1/health'
    ]
  });
});

// Enhanced error handler
app.use((err, req, res, next) => {
  const errorResponse = {
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Log the error
  console.error('💥 Server error:', {
    timestamp: errorResponse.timestamp,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Handle specific error types
  if (err.message.includes('Not allowed by CORS')) {
    errorResponse.code = 'CORS_ERROR';
    errorResponse.message = 'Cross-origin request blocked';
    errorResponse.allowedOrigins = allowedOrigins;
    return res.status(403).json(errorResponse);
  }

  if (err.name === 'ValidationError') {
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.message = 'Validation failed';
    errorResponse.errors = err.errors;
    return res.status(422).json(errorResponse);
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    errorResponse.code = 'DATABASE_ERROR';
    errorResponse.message = 'Database operation failed';
    return res.status(503).json(errorResponse);
  }

  // Development error details
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = {
      message: err.message,
      stack: err.stack
    };
  }

  res.status(500).json(errorResponse);
});

// Serverless handler for Vercel
const vercelHandler = async (req, res) => {
  // Manually set CORS headers for Vercel
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));
    res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('Vercel handler error:', err);
    return res.status(503).json({
      status: 'error',
      code: 'SERVER_UNAVAILABLE',
      message: 'Service unavailable - Database connection failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = vercelHandler;

// Local development server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  
  const startServer = async () => {
    try {
      await connectDB();
      
      const server = app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        console.log(`🔗 MongoDB URI: ${MONGODB_URI}`);
        console.log(`🌱 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌍 Allowed CORS Origins: ${allowedOrigins.join(', ')}`);
        console.log(`📅 Server started at: ${new Date().toISOString()}\n`);
      });

      // Graceful shutdown
      const gracefulShutdown = () => {
        console.log('\n🛑 Received shutdown signal, closing server...');
        server.close(() => {
          mongoose.connection.close(false, () => {
            console.log('Server and MongoDB connection closed');
            process.exit(0);
          });
        });
      };

      process.on('SIGINT', gracefulShutdown);
      process.on('SIGTERM', gracefulShutdown);
      mongoose.connection.on('error', err => console.error('MongoDB connection error:', err));
      mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  };

  startServer();
}