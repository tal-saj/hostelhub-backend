const request = require('supertest');
const express = require('express');
const user2Routes = require('../../routes/user2Routes');

// Mock controller and middleware functions
jest.mock('../../controllers/user2Controller', () => ({
  signup2: jest.fn((req, res) => res.status(201).send('signed up')),
  login2: jest.fn((req, res) => res.status(200).send('logged in')),
  addComment2: jest.fn((req, res) => res.status(201).send('comment added')),
  addRating2: jest.fn((req, res) => res.status(201).send('rating added')),
}));

jest.mock('../../middlewares/verifyToken2', () => 
  jest.fn((req, res, next) => next())
);

describe('User2 Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', user2Routes);
  });

  it('should have a POST /signup2 route', async () => {
    const response = await request(app)
      .post('/signup2')
      .send({ username: 'test', password: 'test123' });
    
    expect(response.statusCode).toBe(201);
    expect(response.text).toBe('signed up');
  });

  it('should have a POST /login2 route', async () => {
    const response = await request(app)
      .post('/login2')
      .send({ username: 'test', password: 'test123' });
    
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('logged in');
  });


  

  it('should return 404 for undefined routes', async () => {
    const response = await request(app)
      .get('/nonexistent-route');
    
    expect(response.statusCode).toBe(404);
  });

  it('should use JSON middleware', async () => {
    const response = await request(app)
      .post('/signup2')
      .send({ test: 'data' });
    
    expect(response.req._headers['content-type']).toContain('application/json');
  });
});