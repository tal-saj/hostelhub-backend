const { signup2, login2, addComment2, addRating2 } = require('../../controllers/User2Controller');
const User2 = require('../../models/User2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock the dependencies
jest.mock('../../models/User2');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('User2 Controller Tests', () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup2', () => {
    it('should return 400 if email already exists', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      User2.findOne.mockResolvedValue({ email: 'test@example.com' });

      await signup2(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Email already in use',
      });
    });

    it('should return 201 and success message on successful registration', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      User2.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User2.prototype.save.mockResolvedValue(true);

      await signup2(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
      });
    });

    it('should return 500 when an error occurs', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      User2.findOne.mockRejectedValue(new Error('Database error'));

      await signup2(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error registering user',
        error: expect.anything(),
      });
    });
  });

  describe('login2', () => {
    it('should return 404 if user not found', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      User2.findOne.mockResolvedValue(null);

      await login2(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    it('should return 400 if password is invalid', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        email: 'test@example.com',
        password: 'hashedPassword',
        _id: '123',
      };

      User2.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await login2(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });

    it('should return 200 with token on successful login', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'correctpassword',
      };

      const mockUser = {
        email: 'test@example.com',
        password: 'hashedPassword',
        _id: '123',
      };

      User2.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockToken');

      await login2(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Login successful',
        token: 'mockToken',
        user: mockUser,
      });
    });
  });


});