import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { setupAuth, hashPassword } from '../server/auth';
import { storage } from '../server/storage';

const app = express();
app.use(express.json());
setupAuth(app);

describe('Authentication', () => {
  beforeEach(async () => {
    // Create test admin user
    const hashedPassword = await hashPassword('testpassword');
    await storage.createAdminUser({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      role: 'admin',
      mustChangePassword: false
    });
  });

  test('should register new admin user', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('newuser@example.com');
    expect(response.body.name).toBe('New User');
  });

  test('should not register user with existing email', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Duplicate User'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Email already exists');
  });

  test('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
  });

  test('should not login with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  test('should return 401 for protected routes without auth', async () => {
    const response = await request(app).get('/api/user');
    expect(response.status).toBe(401);
  });

  test('should change password with valid current password', async () => {
    // Login first
    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });

    const cookie = loginResponse.headers['set-cookie'];

    const response = await request(app)
      .post('/api/change-password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'testpassword',
        newPassword: 'newpassword123'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password changed successfully');
  });
});
