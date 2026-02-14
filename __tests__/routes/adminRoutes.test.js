const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../routes/adminRoutes');

// Mock controller functions
jest.mock('../../controllers/adminController', () => ({
  adminLogin: jest.fn((req, res) => res.status(200).send('login')),
  getAllUsers: jest.fn((req, res) => res.status(200).send('users')),
  updateUserStatus: jest.fn((req, res) => res.status(200).send('status updated')),
  updateUserStatusV2: jest.fn((req, res) => res.status(200).send('status updated v2')),
}));

describe('Admin Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', adminRoutes);
  });

  it('should have a POST /login route', async () => {
    const response = await request(app)
      .post('/login')
      .send({ username: 'admin', password: 'password' });
    
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('login');
  });

  it('should have a GET /users route', async () => {
    const response = await request(app)
      .get('/users');
    
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('users');
  });

  it('should have a POST /update-user-status route', async () => {
    const response = await request(app)
      .post('/update-user-status')
      .send({ userId: 1, status: 'approved' });
    
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('status updated');
  });

  it('should have a POST /update-user-status-v2 route', async () => {
    const response = await request(app)
      .post('/update-user-status-v2')
      .send({ userId: 1, status: 'approved' });
    
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('status updated v2');
  });

  it('should return 404 for undefined routes', async () => {
    const response = await request(app)
      .get('/nonexistent-route');
    
    expect(response.statusCode).toBe(404);
  });

  it('should use JSON middleware', async () => {
    const response = await request(app)
      .post('/login')
      .send({ test: 'data' });
    
    expect(response.req._headers['content-type']).toContain('application/json');
  });
});