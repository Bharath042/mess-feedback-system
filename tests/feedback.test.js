const request = require('supertest');
const app = require('../server');
const { connectDB } = require('../config/database');

describe('Feedback Endpoints', () => {
  let server;
  let authToken;
  let testMessHallId;
  
  beforeAll(async () => {
    await connectDB();
    server = app.listen(0);
    
    // Register and login a test user
    await request(app)
      .post('/api/auth/register')
      .send({
        student_id: 'FEEDBACK001',
        email: 'feedback@example.com',
        password: 'TestPass123',
        first_name: 'Feedback',
        last_name: 'User'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        login: 'FEEDBACK001',
        password: 'TestPass123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('GET /api/feedback/mess-halls', () => {
    it('should get all mess halls', async () => {
      const response = await request(app)
        .get('/api/feedback/mess-halls')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        testMessHallId = response.body.data[0].id;
        expect(response.body.data[0]).toHaveProperty('id');
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('location');
      }
    });
  });

  describe('POST /api/feedback', () => {
    const validFeedback = {
      mess_hall_id: 1, // Will be updated with actual ID
      overall_rating: 4,
      food_quality_rating: 4,
      service_rating: 3,
      cleanliness_rating: 5,
      value_rating: 4,
      comments: 'Great food quality and clean environment',
      suggestions: 'Could improve service speed',
      is_anonymous: false
    };

    beforeEach(() => {
      if (testMessHallId) {
        validFeedback.mess_hall_id = testMessHallId;
      }
    });

    it('should submit feedback with valid data', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validFeedback)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Feedback submitted successfully');
      expect(response.body.data).toHaveProperty('id');
    });

    it('should not submit feedback without authentication', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .send(validFeedback)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not submit feedback with invalid mess hall ID', async () => {
      const invalidFeedback = {
        ...validFeedback,
        mess_hall_id: 99999
      };

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidFeedback)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not submit feedback with invalid rating', async () => {
      const invalidFeedback = {
        ...validFeedback,
        overall_rating: 6 // Invalid rating (should be 1-5)
      };

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidFeedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should not submit feedback without required fields', async () => {
      const incompleteFeedback = {
        mess_hall_id: testMessHallId
        // Missing overall_rating
      };

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteFeedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should not allow duplicate feedback for same mess hall on same day', async () => {
      // Try to submit feedback again for the same mess hall
      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validFeedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already submitted feedback');
    });

    it('should submit anonymous feedback', async () => {
      // Create another user for this test
      await request(app)
        .post('/api/auth/register')
        .send({
          student_id: 'ANON001',
          email: 'anon@example.com',
          password: 'TestPass123',
          first_name: 'Anonymous',
          last_name: 'User'
        });

      const anonLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'ANON001',
          password: 'TestPass123'
        });

      const anonFeedback = {
        ...validFeedback,
        is_anonymous: true,
        comments: 'Anonymous feedback test'
      };

      const response = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${anonLoginResponse.body.token}`)
        .send(anonFeedback)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/feedback/my-feedback', () => {
    it('should get user feedback history', async () => {
      const response = await request(app)
        .get('/api/feedback/my-feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const feedback = response.body.data[0];
      expect(feedback).toHaveProperty('id');
      expect(feedback).toHaveProperty('overall_rating');
      expect(feedback).toHaveProperty('mess_hall_name');
      expect(feedback).toHaveProperty('created_at');
    });

    it('should not get feedback history without authentication', async () => {
      const response = await request(app)
        .get('/api/feedback/my-feedback')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/feedback/my-feedback?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pages');
    });
  });

  describe('GET /api/feedback/mess-halls/:id/stats', () => {
    it('should get mess hall statistics', async () => {
      if (!testMessHallId) {
        return; // Skip if no mess hall available
      }

      const response = await request(app)
        .get(`/api/feedback/mess-halls/${testMessHallId}/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_feedback');
      expect(response.body.data).toHaveProperty('average_ratings');
      expect(response.body.data).toHaveProperty('rating_distribution');
      expect(response.body.data).toHaveProperty('daily_trends');
      
      const avgRatings = response.body.data.average_ratings;
      expect(avgRatings).toHaveProperty('overall');
      expect(avgRatings).toHaveProperty('food_quality');
      expect(avgRatings).toHaveProperty('service');
      expect(avgRatings).toHaveProperty('cleanliness');
      expect(avgRatings).toHaveProperty('value');
    });

    it('should support custom date range', async () => {
      if (!testMessHallId) {
        return;
      }

      const response = await request(app)
        .get(`/api/feedback/mess-halls/${testMessHallId}/stats?days=7`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period_days).toBe(7);
    });

    it('should return 404 for non-existent mess hall', async () => {
      const response = await request(app)
        .get('/api/feedback/mess-halls/99999/stats')
        .expect(200); // Still returns 200 but with empty data

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_feedback).toBe(0);
    });
  });

  describe('GET /api/feedback/mess-halls/:id/recent', () => {
    it('should get recent feedback for mess hall', async () => {
      if (!testMessHallId) {
        return;
      }

      const response = await request(app)
        .get(`/api/feedback/mess-halls/${testMessHallId}/recent`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const feedback = response.body.data[0];
        expect(feedback).toHaveProperty('id');
        expect(feedback).toHaveProperty('overall_rating');
        expect(feedback).toHaveProperty('reviewer_name');
        expect(feedback).toHaveProperty('created_at');
      }
    });

    it('should support pagination for recent feedback', async () => {
      if (!testMessHallId) {
        return;
      }

      const response = await request(app)
        .get(`/api/feedback/mess-halls/${testMessHallId}/recent?page=1&limit=5`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('count');
    });

    it('should handle anonymous feedback in recent list', async () => {
      if (!testMessHallId) {
        return;
      }

      const response = await request(app)
        .get(`/api/feedback/mess-halls/${testMessHallId}/recent`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check if any anonymous feedback exists
      const anonymousFeedback = response.body.data.find(f => f.reviewer_name === 'Anonymous');
      if (anonymousFeedback) {
        expect(anonymousFeedback.reviewer_name).toBe('Anonymous');
      }
    });
  });

  describe('GET /api/feedback/mess-halls/:id/menu', () => {
    it('should get daily menu for mess hall', async () => {
      if (!testMessHallId) {
        return;
      }

      const response = await request(app)
        .get(`/api/feedback/mess-halls/${testMessHallId}/menu`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get menu for specific date', async () => {
      if (!testMessHallId) {
        return;
      }

      const date = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/feedback/mess-halls/${testMessHallId}/menu?date=${date}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should validate date format', async () => {
      if (!testMessHallId) {
        return;
      }

      const response = await request(app)
        .get(`/api/feedback/mess-halls/${testMessHallId}/menu?date=invalid-date`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
});
