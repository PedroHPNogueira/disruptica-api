import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure ValidationPipe like in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prismaService.user.deleteMany();
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(HttpStatus.CREATED);
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type');
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.expires_in).toBe(86400);
      expect(typeof response.body.access_token).toBe('string');
      expect(response.body.access_token.length).toBeGreaterThan(0);
    });

    it('should return 400 when email is incorrect', async () => {
      const loginDto = {
        email: 'wrong@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Email or password is incorrect');
    });

    it('should return 400 when password is incorrect', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Email or password is incorrect');
    });

    it('should return 400 when email is missing', async () => {
      const loginDto = {
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password is missing', async () => {
      const loginDto = {
        email: 'test@example.com',
      };

      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when both credentials are missing', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({}).expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Protected Routes', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create a test user
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'auth-test@example.com',
          password: 'password123',
          name: 'Auth Test User',
        })
        .expect(HttpStatus.CREATED);

      // Login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'auth-test@example.com',
          password: 'password123',
        })
        .expect(HttpStatus.OK);

      authToken = loginResponse.body.access_token;
    });

    describe('GET /users (protected)', () => {
      it('should access protected route with valid token', async () => {
        const response = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('email');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).not.toHaveProperty('password');
      });

      it('should return 401 when token is missing', async () => {
        await request(app.getHttpServer()).get('/users').expect(HttpStatus.UNAUTHORIZED);
      });

      it('should return 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', 'Bearer invalid-token')
          .expect(HttpStatus.UNAUTHORIZED);
      });

      it('should return 401 when token format is wrong', async () => {
        await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', 'InvalidFormat token-here')
          .expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('GET /users/:id (protected)', () => {
      it('should access protected route with valid token', async () => {
        // First get the user ID
        const usersResponse = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const userId = usersResponse.body[0].id;

        // Then get specific user
        const response = await request(app.getHttpServer())
          .get(`/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(response.body.id).toBe(userId);
        expect(response.body).toHaveProperty('email');
        expect(response.body).toHaveProperty('name');
        expect(response.body).not.toHaveProperty('password');
      });

      it('should return 401 when accessing protected route without token', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

        await request(app.getHttpServer()).get(`/users/${nonExistentId}`).expect(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete auth flow', async () => {
      // 1. Create user
      const createUserDto = {
        email: 'integration@example.com',
        password: 'password123',
        name: 'Integration User',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.CREATED);

      expect(createResponse.body).toHaveProperty('id');

      // 2. Login with created user
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: createUserDto.email,
          password: createUserDto.password,
        })
        .expect(HttpStatus.OK);

      const token = loginResponse.body.access_token;

      // 3. Access protected route with token
      const protectedResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(protectedResponse.body).toHaveLength(1);
      expect(protectedResponse.body[0].email).toBe(createUserDto.email);

      // 4. Verify token contains correct user data
      const userResponse = await request(app.getHttpServer())
        .get(`/users/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(userResponse.body.id).toBe(createResponse.body.id);
      expect(userResponse.body.email).toBe(createUserDto.email);
      expect(userResponse.body.name).toBe(createUserDto.name);
    });

    it('should handle multiple users login and access', async () => {
      const users = [
        { email: 'user1@test.com', password: 'password123', name: 'User 1' },
        { email: 'user2@test.com', password: 'password123', name: 'User 2' },
      ];

      // Create multiple users
      for (const user of users) {
        await request(app.getHttpServer()).post('/users').send(user).expect(HttpStatus.CREATED);
      }

      // Login with each user and verify access
      for (const user of users) {
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: user.password })
          .expect(HttpStatus.OK);

        const token = loginResponse.body.access_token;

        // Verify each user can access protected routes
        const usersResponse = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${token}`)
          .expect(HttpStatus.OK);

        expect(usersResponse.body).toHaveLength(2);
      }
    });

    it('should reject expired or invalid tokens', async () => {
      // Create user and login
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'token-test@example.com',
          password: 'password123',
          name: 'Token Test User',
        })
        .expect(HttpStatus.CREATED);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'token-test@example.com',
          password: 'password123',
        })
        .expect(HttpStatus.OK);

      const validToken = loginResponse.body.access_token;

      // Test with valid token (should work)
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);

      // Test with invalid token (should fail)
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(HttpStatus.UNAUTHORIZED);

      // Test with malformed token (should fail)
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer not-a-jwt-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
