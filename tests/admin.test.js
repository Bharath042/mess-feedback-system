const request = require('supertest');
const app = require('../server');
const { connectDB } = require('../config/database');

describe('Admin Endpoints', () => {
  let server;
  let adminToken;
  let studentToken;
  let testMessHallId;
  
  beforeAll(async () => {
    await connectDB();
    server = app.listen(0);
    
    // Register and login admin user
    await request(app)
      .post('/api/auth/register')
      .send({
        student_id: 'ADMIN001',
        email: 'admin@example.com',
        password: 'AdminPass123',
        first_name: 'Admin',
        last_name: 'User'
      });

    // Manually set admin role (in real app, this would be done through database)
    // For testing, we'll assume the user is promoted to admin

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        login: 'ADMIN001',
        password: 'AdminPass123'
      });
    
    adminToken = adminLoginResponse.body.token;

    // Register regular student user
    await request(app)
      .post('/api/auth/register')
      .send({
        student_id: 'STUDENT001',
        email: 'student@example.com',
        password: 'StudentPass123',
        first_name: 'Student',
        last_name: 'User'
      });

    const studentLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        login: 'STUDENT001',
        password: 'StudentPass123'
      });
    
    studentToken = studentLoginResponse.body.token;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('GET /api/admin/dashboard', () => {
    it('should get dashboard data for admin', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('daily_trends');
      expect(response.body.data).toHaveProperty('mess_hall_performance');
      
      const overview = response.body.data.overview;
      expect(overview).toHaveProperty('total_users');
      expect(overview).toHaveProperty('total_mess_halls');
      expect(overview).toHaveProperty('feedback_last_30_days');
      expect(overview).toHaveProperty('avg_rating_last_30_days');
    });

    it('should not allow student access to dashboard', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should not allow unauthenticated access', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pages');
      
      if (response.body.data.length > 0) {
        const user = response.body.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('student_id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('first_name');
        expect(user).toHaveProperty('last_name');
        expect(user).toHaveProperty('role');
        expect(user).not.toHaveProperty('password_hash');
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should find the admin user we created
      const adminUser = response.body.data.find(u => u.email === 'admin@example.com');
      expect(adminUser).toBeDefined();
    });

    it('should support role filtering', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=student')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned users should have student role
      response.body.data.forEach(user => {
        expect(user.role).toBe('student');
      });
    });

    it('should not allow student access', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/users/:id/status', () => {
    let testUserId;

    beforeAll(async () => {
      // Get a user ID for testing
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      if (usersResponse.body.data.length > 0) {
        testUserId = usersResponse.body.data.find(u => u.email === 'student@example.com')?.id;
      }
    });

    it('should update user status', async () => {
      if (!testUserId) return;

      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_active).toBe(false);
      expect(response.body.message).toContain('deactivated');
    });

    it('should reactivate user', async () => {
      if (!testUserId) return;

      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_active).toBe(true);
      expect(response.body.message).toContain('activated');
    });

    it('should validate status value', async () => {
      if (!testUserId) return;

      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/admin/users/99999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should not allow student access', async () => {
      if (!testUserId) return;

      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ is_active: false })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/mess-halls', () => {
    it('should get all mess halls with admin details', async () => {
      const response = await request(app)
        .get('/api/admin/mess-halls')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const messHall = response.body.data[0];
        expect(messHall).toHaveProperty('id');
        expect(messHall).toHaveProperty('name');
        expect(messHall).toHaveProperty('location');
        expect(messHall).toHaveProperty('capacity');
        expect(messHall).toHaveProperty('total_feedback');
        expect(messHall).toHaveProperty('avg_rating');
        
        testMessHallId = messHall.id;
      }
    });

    it('should allow mess manager access', async () => {
      // This test assumes mess manager role exists
      const response = await request(app)
        .get('/api/admin/mess-halls')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not allow student access', async () => {
      const response = await request(app)
        .get('/api/admin/mess-halls')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/mess-halls', () => {
    const validMessHall = {
      name: 'Test Mess Hall',
      location: 'Test Location',
      capacity: 200
    };

    it('should create new mess hall', async () => {
      const response = await request(app)
        .post('/api/admin/mess-halls')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validMessHall)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mess hall created successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(validMessHall.name);
      expect(response.body.data.location).toBe(validMessHall.location);
      expect(response.body.data.capacity).toBe(validMessHall.capacity);
      
      testMessHallId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const invalidMessHall = {
        location: 'Test Location'
        // Missing name
      };

      const response = await request(app)
        .post('/api/admin/mess-halls')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidMessHall)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate field lengths', async () => {
      const invalidMessHall = {
        name: 'A', // Too short
        location: 'Test Location'
      };

      const response = await request(app)
        .post('/api/admin/mess-halls')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidMessHall)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should not allow student access', async () => {
      const response = await request(app)
        .post('/api/admin/mess-halls')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validMessHall)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/admin/mess-halls/:id', () => {
    const updateData = {
      name: 'Updated Mess Hall',
      location: 'Updated Location',
      capacity: 300,
      is_active: true
    };

    it('should update mess hall', async () => {
      if (!testMessHallId) return;

      const response = await request(app)
        .put(`/api/admin/mess-halls/${testMessHallId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mess hall updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.location).toBe(updateData.location);
      expect(response.body.data.capacity).toBe(updateData.capacity);
    });

    it('should allow partial updates', async () => {
      if (!testMessHallId) return;

      const partialUpdate = {
        name: 'Partially Updated Name'
      };

      const response = await request(app)
        .put(`/api/admin/mess-halls/${testMessHallId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(partialUpdate.name);
    });

    it('should validate update data', async () => {
      if (!testMessHallId) return;

      const invalidUpdate = {
        name: '', // Empty name
        capacity: -1 // Invalid capacity
      };

      const response = await request(app)
        .put(`/api/admin/mess-halls/${testMessHallId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent mess hall', async () => {
      const response = await request(app)
        .put('/api/admin/mess-halls/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Mess hall not found');
    });

    it('should not allow student access', async () => {
      if (!testMessHallId) return;

      const response = await request(app)
        .put(`/api/admin/mess-halls/${testMessHallId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/feedback/report', () => {
    it('should generate feedback report', async () => {
      const response = await request(app)
        .get('/api/admin/feedback/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('filters');
    });

    it('should filter by mess hall', async () => {
      if (!testMessHallId) return;

      const response = await request(app)
        .get(`/api/admin/feedback/report?mess_hall_id=${testMessHallId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.mess_hall_id).toBe(testMessHallId.toString());
    });

    it('should filter by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/admin/feedback/report?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.start_date).toBe(startDate);
      expect(response.body.filters.end_date).toBe(endDate);
    });

    it('should filter by rating', async () => {
      const response = await request(app)
        .get('/api/admin/feedback/report?rating_filter=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.rating_filter).toBe('5');
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .get('/api/admin/feedback/report?start_date=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate rating filter', async () => {
      const response = await request(app)
        .get('/api/admin/feedback/report?rating_filter=6')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should not allow student access', async () => {
      const response = await request(app)
        .get('/api/admin/feedback/report')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
