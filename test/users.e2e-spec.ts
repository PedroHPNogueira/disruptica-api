import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // Helper function to create user and get auth token
  const createUserAndGetToken = async (
    userData = {
      email: 'auth-user@example.com',
      password: 'password123',
      name: 'Auth User',
    },
  ): Promise<string> => {
    // Create user
    await request(app.getHttpServer()).post('/users').send(userData).expect(HttpStatus.CREATED);

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userData.email,
        password: userData.password,
      })
      .expect(HttpStatus.OK);

    return loginResponse.body.access_token as string;
  };

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

  describe('POST /users', () => {
    it('should create a user successfully', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer()).post('/users').send(createUserDto).expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body.name).toBe(createUserDto.name);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 400 when email is invalid', async () => {
      const createUserDto = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('Email must be a valid email address');
    });

    it('should return 400 when password is too short', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('Password must be at least 6 characters long');
    });

    it('should return 400 when required fields are missing', async () => {
      const createUserDto = {
        email: 'test@example.com',
        // missing password and name
      };

      await request(app.getHttpServer()).post('/users').send(createUserDto).expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when user already exists', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // Create user first time
      await request(app.getHttpServer()).post('/users').send(createUserDto).expect(HttpStatus.CREATED);

      // Try to create same user again
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('User already exists');
    });

    it('should return 400 when extra fields are sent', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        extraField: 'should not be allowed',
      };

      await request(app.getHttpServer()).post('/users').send(createUserDto).expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /users', () => {
    it('should return empty array when no users exist', async () => {
      // Create auth user and get token
      const token = await createUserAndGetToken();

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      // Should return the auth user that was created
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0].email).toBe('auth-user@example.com');
    });

    it('should return all users', async () => {
      // Create test users
      const user1 = {
        email: 'user1@example.com',
        password: 'password123',
        name: 'User One',
      };

      const user2 = {
        email: 'user2@example.com',
        password: 'password123',
        name: 'User Two',
      };

      await request(app.getHttpServer()).post('/users').send(user1).expect(HttpStatus.CREATED);
      await request(app.getHttpServer()).post('/users').send(user2).expect(HttpStatus.CREATED);

      // Create auth user and get token
      const token = await createUserAndGetToken();

      // Get all users
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(3); // user1, user2, and auth user
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).not.toHaveProperty('password');
      expect(response.body[1]).toHaveProperty('id');
      expect(response.body[1]).toHaveProperty('email');
      expect(response.body[1]).toHaveProperty('name');
      expect(response.body[1]).not.toHaveProperty('password');
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id', async () => {
      // Create a user first
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.CREATED);

      const userId = createResponse.body.id;

      // Create auth user and get token
      const token = await createUserAndGetToken();

      // Get user by id
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body.name).toBe(createUserDto.name);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 when user not found', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      // Create auth user and get token
      const token = await createUserAndGetToken();

      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 when id format is invalid', async () => {
      const invalidId = 'invalid-uuid';

      // Create auth user and get token
      const token = await createUserAndGetToken();

      await request(app.getHttpServer())
        .get(`/users/${invalidId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      // 1. Create user
      const createUserDto = {
        email: 'lifecycle@example.com',
        password: 'password123',
        name: 'Lifecycle User',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.CREATED);

      const userId = createResponse.body.id;

      // 2. Create auth user and get token
      const token = await createUserAndGetToken();

      // 3. Verify user appears in list
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(listResponse.body).toHaveLength(2); // lifecycle user + auth user
      const lifecycleUser = (listResponse.body as any[]).find((u) => u.id === userId);
      expect(lifecycleUser).toBeDefined();

      // 4. Get user by id
      const getResponse = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(getResponse.body.id).toBe(userId);
      expect(getResponse.body.email).toBe(createUserDto.email);
    });

    it('should handle multiple users creation and retrieval', async () => {
      const users = [
        { email: 'user1@test.com', password: 'password123', name: 'User 1' },
        { email: 'user2@test.com', password: 'password123', name: 'User 2' },
        { email: 'user3@test.com', password: 'password123', name: 'User 3' },
      ];

      // Create multiple users
      const createdUsers: any[] = [];
      for (const user of users) {
        const response = await request(app.getHttpServer()).post('/users').send(user).expect(HttpStatus.CREATED);
        createdUsers.push(response.body);
      }

      // Create auth user and get token
      const token = await createUserAndGetToken();

      // Verify all users exist
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(listResponse.body).toHaveLength(4); // 3 created users + auth user

      // Verify each user can be retrieved individually
      for (const user of createdUsers) {
        await request(app.getHttpServer())
          .get(`/users/${user.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(HttpStatus.OK);
      }
    });
  });
});
