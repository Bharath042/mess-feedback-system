const request = require('supertest');
const app = require('../server');
const { connectDB } = require('../config/database');

describe('Authentication Endpoints', () => {
  let server;
  
  beforeAll(async () => {
    // Connect to test database
    await connectDB();
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      student_id: 'TEST001',
      email: 'test@example.com',
      password: 'TestPass123',
      first_name: 'Test',
      last_name: 'User',
      hostel: 'Test Hostel',
      year_of_study: 2,
      department: 'Computer Science'
    };

    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(validUser.email);
      expect(response.body.user.student_id).toBe(validUser.student_id);
    });

    it('should not register user with duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(400);
    });

    it('should not register user with invalid email', async () => {
      const invalidUser = { ...validUser, email: 'invalid-email', student_id: 'TEST002' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should not register user with weak password', async () => {
      const weakPasswordUser = { ...validUser, password: '123', student_id: 'TEST003' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should not register user with missing required fields', async () => {
      const incompleteUser = {
        email: 'incomplete@example.com',
        password: 'TestPass123'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    const loginCredentials = {
      login: 'TEST001',
      password: 'TestPass123'
    };

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    it('should login with email instead of student_id', async () => {
      const emailLogin = {
        login: 'test@example.com',
        password: 'TestPass123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(emailLogin)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const invalidCredentials = {
        login: 'TEST001',
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should not login with non-existent user', async () => {
      const nonExistentUser = {
        login: 'NONEXISTENT',
        password: 'TestPass123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(nonExistentUser)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should not login with missing fields', async () => {
      const incompleteLogin = {
        login: 'TEST001'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(incompleteLogin)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'TEST001',
          password: 'TestPass123'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.student_id).toBe('TEST001');
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not authorized to access this route');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not authorized to access this route');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let authToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'TEST001',
          password: 'TestPass123'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should update profile with valid data', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        hostel: 'New Hostel',
        year_of_study: 3,
        department: 'Updated Department'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.first_name).toBe('Updated');
      expect(response.body.user.last_name).toBe('Name');
      expect(response.body.user.year_of_study).toBe(3);
    });

    it('should not update profile without authentication', async () => {
      const updateData = {
        first_name: 'Updated'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not update profile with invalid data', async () => {
      const invalidData = {
        first_name: 'A', // Too short
        year_of_study: 10 // Invalid year
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/auth/password', () => {
    let authToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'TEST001',
          password: 'TestPass123'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'TestPass123',
        newPassword: 'NewTestPass123'
      };

      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'TEST001',
          password: 'NewTestPass123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should not change password with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword',
        newPassword: 'AnotherNewPass123'
      };

      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('should not change password with weak new password', async () => {
      const passwordData = {
        currentPassword: 'NewTestPass123',
        newPassword: '123' // Too weak
      };

      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User logged out successfully');
    });
  });
});
