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
    getHostelsByCategory,
    getAllCategories
  } = require('../../controllers/userController');
  const User = require('../../models/User');
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const { deleteFromCloudinary } = require('../../utils/cloudinary');
  
  // Mock all dependencies
  jest.mock('../../models/User');
  jest.mock('bcrypt');
  jest.mock('jsonwebtoken');
  jest.mock('../../utils/cloudinary');
  
  describe('User Controller Tests', () => {
    let mockRequest, mockResponse;
  
    beforeEach(() => {
      mockRequest = {
        body: {},
        params: {},
        user: {},
        files: null
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    describe('registerUser', () => {
      it('should return 400 if required fields are missing', async () => {
        mockRequest.body = {};
        
        await registerUser(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'All fields are required'
        });
      });
  
      it('should return 409 if email or phone already exists', async () => {
        mockRequest.body = {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          password: 'password123'
        };
  
        User.findOne.mockResolvedValue({ email: 'test@example.com' });
  
        await registerUser(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Email or phone already in use'
        });
      });
  
      it('should return 201 and create user on successful registration', async () => {
        mockRequest.body = {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          password: 'password123'
        };
  
        User.findOne.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('hashedPassword');
        const mockUser = {
          _id: '123',
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          save: jest.fn().mockResolvedValue(true)
        };
        User.mockImplementation(() => mockUser);
  
        await registerUser(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'User registered successfully',
          user: {
            _id: '123',
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890'
          }
        });
      });
    });
  
    describe('loginUser', () => {
      it('should return 400 if email or password is missing', async () => {
        mockRequest.body = {};
        
        await loginUser(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Email and password are required'
        });
      });
  
      it('should return 401 if user not found', async () => {
        mockRequest.body = {
          email: 'nonexistent@example.com',
          password: 'password123'
        };
  
        User.findOne.mockResolvedValue(null);
  
        await loginUser(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid credentials'
        });
      });
  
      it('should return 200 with token on successful login', async () => {
        mockRequest.body = {
          email: 'test@example.com',
          password: 'correctpassword'
        };
  
        const mockUser = {
          _id: '123',
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          role: 'user',
          password: 'hashedPassword'
        };
  
        User.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mockToken');
  
        await loginUser(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Login successful',
          token: 'mockToken',
          user: {
            _id: '123',
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890',
            role: 'user'
          }
        });
      });
    });
  
    describe('updateUserProfile', () => {
      it('should return 200 and update profile successfully', async () => {
        mockRequest.user = {
          _id: '123',
          name: 'Test User',
          email: 'test@example.com',
          save: jest.fn().mockResolvedValue(true)
        };
        mockRequest.body = {
          address: '123 Test St',
          dob: '1990-01-01',
          cnic: '12345-6789012-3'
        };
        mockRequest.files = {
          cnicFrontImage: [{ path: 'path/to/front.jpg' }],
          cnicBackImage: [{ path: 'path/to/back.jpg' }]
        };
  
        await updateUserProfile(mockRequest, mockResponse);
  
        expect(mockRequest.user.address).toBe('123 Test St');
        expect(mockRequest.user.dob).toBe('1990-01-01');
        expect(mockRequest.user.cnic).toBe('12345-6789012-3');
        expect(mockRequest.user.cnicFrontImage).toBe('path/to/front.jpg');
        expect(mockRequest.user.cnicBackImage).toBe('path/to/back.jpg');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });
  
    describe('paymentPlanController', () => {
      describe('subscribePlan', () => {
        it('should return 400 for invalid plan type', async () => {
          mockRequest.body = { type: 'invalid' };
          mockRequest.user = { _id: '123' };
  
          await paymentPlanController.subscribePlan(mockRequest, mockResponse);
  
          expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
  
        it('should successfully subscribe to monthly plan', async () => {
          mockRequest.body = { type: 'monthly' };
          mockRequest.user = { _id: '123' };
          
          const mockUser = {
            _id: '123',
            paymentPlan: null,
            save: jest.fn().mockResolvedValue(true)
          };
          User.findById.mockResolvedValue(mockUser);
  
          await paymentPlanController.subscribePlan(mockRequest, mockResponse);
  
          expect(mockUser.paymentPlan.planType).toBe('monthly');
          expect(mockUser.paymentPlan.isActive).toBe(true);
          expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
      });
  
      describe('cancelPlan', () => {
        it('should successfully cancel active plan', async () => {
          mockRequest.user = { _id: '123' };
          
          const mockUser = {
            _id: '123',
            paymentPlan: {
              planType: 'monthly',
              isActive: true,
              startDate: new Date()
            },
            save: jest.fn().mockResolvedValue(true)
          };
          User.findById.mockResolvedValue(mockUser);
  
          await paymentPlanController.cancelPlan(mockRequest, mockResponse);
  
          expect(mockUser.paymentPlan.isActive).toBe(false);
          expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
      });
  
      describe('getUserPaymentPlan', () => {
        it('should return user payment plan', async () => {
          mockRequest.user = { _id: '123' };
          
          const mockUser = {
            _id: '123',
            paymentPlan: {
              planType: 'monthly',
              isActive: true
            }
          };
          User.findById.mockResolvedValue(mockUser);
  
          await paymentPlanController.getUserPaymentPlan(mockRequest, mockResponse);
  
          expect(mockResponse.status).toHaveBeenCalledWith(200);
          expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            paymentPlan: mockUser.paymentPlan
          });
        });
      });
    });
  
    describe('manageProperty', () => {
      it('should return 400 if required fields are missing', async () => {
        mockRequest.body = {};
        mockRequest.user = { _id: '123' };
  
        await manageProperty(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
  

    });
  
   
      
      
    describe('getAllCities', () => {
      it('should return all cities with approved hostels', async () => {
        User.distinct.mockResolvedValue(['City 1', 'City 2']);
  
        await getAllCities(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          count: 2,
          cities: ['City 1', 'City 2']
        });
      });
    });
  
      
  
    describe('getAllCategories', () => {
      it('should return all hostel categories', async () => {
        User.distinct.mockResolvedValue(['Standard', 'Premium']);
  
        await getAllCategories(mockRequest, mockResponse);
  
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });
  
    
  });