const { adminLogin, getAllUsers, updateUserStatus, updateUserStatusV2 } = require('../../controllers/adminController');
const Admin = require('../../models/Admin');
const User = require('../../models/User');

// Mock the models
jest.mock('../../models/Admin');
jest.mock('../../models/User');

describe('AdminController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Tests for admin Login
  describe('adminLogin', () => {
    it('should return 400 if username or password is missing', async () => {
      // Test missing username
      mockReq.body = { password: 'password' };
      await adminLogin(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Username and password are required' });

      // Test missing password
      mockReq.body = { username: 'admin' };
      await adminLogin(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Username and password are required' });
    });

    it('should return 404 if admin is not found', async () => {
      mockReq.body = { username: 'nonexistent', password: 'password' };
      Admin.findOne.mockResolvedValue(null);
      
      await adminLogin(mockReq, mockRes);
      expect(Admin.findOne).toHaveBeenCalledWith({ username: 'nonexistent' });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Admin not found' });
    });

    it('should return 401 if password is incorrect', async () => {
      mockReq.body = { username: 'admin', password: 'wrongpassword' };
      Admin.findOne.mockResolvedValue({ username: 'admin', password: 'correctpassword' });
      
      await adminLogin(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return success message and token if credentials are correct', async () => {
      mockReq.body = { username: 'admin', password: 'correctpassword' };
      Admin.findOne.mockResolvedValue({ username: 'admin', password: 'correctpassword' });
      
      await adminLogin(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'Login successful', 
        token: 'admin-token' 
      });
    });

    it('should return 500 if there is a server error', async () => {
      mockReq.body = { username: 'admin', password: 'password' };
      Admin.findOne.mockRejectedValue(new Error('Database error'));
      
      await adminLogin(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'Server error', 
        error: 'Database error' 
      });
    });
  });

  //Test Cases for getAllUsers

  describe('getAllUsers', () => {
    it('should return all users with formatted data', async () => {
      const mockUsers = [
        {
          _id: '1',
          name: 'User 1',
          email: 'user1@test.com',
          phone: '1234567890',
          status: 'approved',
          address: 'Address 1',
          dob: new Date(),
          cnic: '12345-6789012-3',
          paymentPlan: 'monthly',
          hostelName: 'Hostel 1',
          hostelAddress: 'Hostel Address 1',
          hostelPrice: 10000
        }
      ];
      
      User.find.mockResolvedValue(mockUsers);
      
      await getAllUsers(mockReq, mockRes);
      
      expect(User.find).toHaveBeenCalledWith({});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        users: mockUsers.map(user => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: user.status,
          address: user.address,
          dob: user.dob,
          cnic: user.cnic,
          paymentPlan: user.paymentPlan,
          hostelName: user.hostelName,
          hostelAddress: user.hostelAddress,
          hostelPrice: user.hostelPrice
        }))
      });
    });

    it('should return 500 if there is an error fetching users', async () => {
      User.find.mockRejectedValue(new Error('Database error'));
      
      await getAllUsers(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'Error fetching users', 
        error: expect.anything() 
      });
    });
  });

  //Test Cases for updateUserStatus
  describe('updateUserStatus', () => {
    it('should return 400 if status is invalid', async () => {
      mockReq.body = { userId: '1', status: 'invalid' };
      
      await updateUserStatus(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid status' });
    });

    it('should return 404 if user is not found', async () => {
      mockReq.body = { userId: 'nonexistent', status: 'approved' };
      User.findById.mockResolvedValue(null);
      
      await updateUserStatus(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should update user status to approved', async () => {
      const mockUser = {
        _id: '1',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      mockReq.body = { userId: '1', status: 'approved' };
      User.findById.mockResolvedValue(mockUser);
      
      await updateUserStatus(mockReq, mockRes);
      expect(mockUser.status).toBe('approved');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User approved' });
    });

    it('should update user status to rejected', async () => {
      const mockUser = {
        _id: '1',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      mockReq.body = { userId: '1', status: 'rejected' };
      User.findById.mockResolvedValue(mockUser);
      
      await updateUserStatus(mockReq, mockRes);
      expect(mockUser.status).toBe('rejected');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User rejected' });
    });

    it('should return 500 if there is an error updating status', async () => {
      mockReq.body = { userId: '1', status: 'approved' };
      User.findById.mockRejectedValue(new Error('Database error'));
      
      await updateUserStatus(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'Error updating user status', 
        error: expect.anything() 
      });
    });
  });

  //Test Cases for updateUserStatusV2

  describe('updateUserStatusV2', () => {
    it('should return 400 if status is invalid', async () => {
      mockReq.body = { userId: '1', status: 'invalid' };
      
      await updateUserStatusV2(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid status' });
    });

    it('should return 404 if user is not found', async () => {
      mockReq.body = { userId: 'nonexistent', status: 'approved' };
      User.findByIdAndUpdate.mockResolvedValue(null);
      
      await updateUserStatusV2(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should update user status and return updated user', async () => {
      const updatedUser = {
        _id: '1',
        status: 'approved'
      };
      mockReq.body = { userId: '1', status: 'approved' };
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);
      
      await updateUserStatusV2(mockReq, mockRes);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        '1', 
        { status: 'approved' }, 
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'User status updated to approved', 
        user: updatedUser 
      });
    });

    it('should return 500 if there is an error updating status', async () => {
      mockReq.body = { userId: '1', status: 'approved' };
      User.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));
      
      await updateUserStatusV2(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'Error updating user status', 
        error: expect.anything() 
      });
    });
  });

  
});