const request = require('supertest');
const express = require('express');
const userRoutes = require('../../routes/userRoutes');

// Mock all controller functions
jest.mock('../../controllers/userController', () => ({
  registerUser: jest.fn((req, res) => res.status(201).send('registered')),
  loginUser: jest.fn((req, res) => res.status(200).send('logged in')),
  updateUserProfile: jest.fn((req, res) => res.status(200).send('profile updated')),
  paymentPlanController: {
    subscribePlan: jest.fn((req, res) => res.status(200).send('subscribed')),
    cancelPlan: jest.fn((req, res) => res.status(200).send('canceled')),
    getUserPaymentPlan: jest.fn((req, res) => res.status(200).send('plan details'))
  },
  deleteUserAccount: jest.fn((req, res) => res.status(200).send('account deleted')),
  manageProperty: jest.fn((req, res) => res.status(200).send('property managed')),
  viewHostels: jest.fn((req, res) => res.status(200).send('hostels viewed')),
  deleteHostel: jest.fn((req, res) => res.status(200).send('hostel deleted')),
  viewAllHostels: jest.fn((req, res) => res.status(200).send('all hostels')),
  getHostelDetails: jest.fn((req, res) => res.status(200).send('hostel details')),
  getAllCities: jest.fn((req, res) => res.status(200).send('cities list')),
  getHostelsByCity: jest.fn((req, res) => res.status(200).send('city hostels')),
  getHostelsByCategory: jest.fn((req, res) => res.status(200).send('category hostels')),
  getAllCategories: jest.fn((req, res) => res.status(200).send('categories list')),
  getCurrentUser: jest.fn((req, res) => res.status(200).send('current user'))
}));

// Mock auth middleware
jest.mock('../../middlewares/authMiddleware', () => 
  jest.fn((req, res, next) => {
    req.user = { _id: '123' };
    next();
  })
);

describe('User Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', userRoutes);
  });

  // Authentication Routes
  it('should have POST /signup route', async () => {
    const response = await request(app)
      .post('/signup')
      .send({ name: 'Test', email: 'test@test.com', password: 'password' });
    expect(response.statusCode).toBe(201);
    expect(response.text).toBe('registered');
  });

  it('should have POST /login route', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'test@test.com', password: 'password' });
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('logged in');
  });

  // Profile Routes
  it('should have PUT /update-profile route', async () => {
    const response = await request(app)
      .put('/update-profile')
      .send({ address: '123 Test St' });
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('profile updated');
  });

  // Payment Plan Routes
  it('should have POST /payment-plan/subscribe route', async () => {
    const response = await request(app)
      .post('/payment-plan/subscribe')
      .send({ type: 'monthly' });
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('subscribed');
  });

  it('should have POST /payment-plan/cancel route', async () => {
    const response = await request(app)
      .post('/payment-plan/cancel');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('canceled');
  });

  it('should have GET /payment-plan/details route', async () => {
    const response = await request(app)
      .get('/payment-plan/details');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('plan details');
  });

  

  // Hostel Routes
  it('should have GET /view-hostels route', async () => {
    const response = await request(app)
      .get('/view-hostels');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('hostels viewed');
  });

  it('should have DELETE /delete-hostel/:hostelId route', async () => {
    const response = await request(app)
      .delete('/delete-hostel/123');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('hostel deleted');
  });

  it('should have GET /view-all-hostels route', async () => {
    const response = await request(app)
      .get('/view-all-hostels');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('all hostels');
  });

  it('should have GET /hostel-details/:hostelId route', async () => {
    const response = await request(app)
      .get('/hostel-details/123');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('hostel details');
  });

  // Location/Category Routes
  it('should have GET /cities route', async () => {
    const response = await request(app)
      .get('/cities');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('cities list');
  });

  it('should have GET /hostels/city/:city route', async () => {
    const response = await request(app)
      .get('/hostels/city/test-city');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('city hostels');
  });

  it('should have GET /hostels-by-category/:category route', async () => {
    const response = await request(app)
      .get('/hostels-by-category/test-category');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('category hostels');
  });

  it('should have GET /categories route', async () => {
    const response = await request(app)
      .get('/categories');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('categories list');
  });

  // Account Management
  it('should have DELETE /account route', async () => {
    const response = await request(app)
      .delete('/account');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('account deleted');
  });

  // Negative Tests
  it('should return 404 for undefined routes', async () => {
    const response = await request(app)
      .get('/nonexistent-route');
    expect(response.statusCode).toBe(404);
  });

  it('should use JSON middleware', async () => {
    const response = await request(app)
      .post('/signup')
      .send({ test: 'data' });
    expect(response.req._headers['content-type']).toContain('application/json');
  });
});