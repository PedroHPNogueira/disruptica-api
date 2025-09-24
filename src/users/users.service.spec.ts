import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CryptoService } from '@/crypto/crypto.service';
import { PrismaService } from '@/prisma.service';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { UsersService } from '@/users/users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let cryptoService: CryptoService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockCryptoService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    hashForSearch: jest.fn(),
    createHash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should create a user successfully', async () => {
      // Arrange
      const emailHash = 'deterministic_email_hash';
      const encryptedEmail = 'encrypted_email_data';
      const encryptedName = 'encrypted_name_data';
      const hashedPassword = '$2b$10$mockHashedPassword';

      const dbUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: encryptedEmail,
        name: encryptedName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock crypto service methods
      mockCryptoService.hashForSearch.mockReturnValue(emailHash);
      mockCryptoService.encrypt.mockResolvedValue('encrypted_data');
      mockCryptoService.createHash.mockResolvedValue(hashedPassword);
      mockCryptoService.decrypt.mockImplementation((encrypted: string): Promise<string> => {
        if (encrypted === 'encrypted_email_data') return Promise.resolve('test@example.com');
        if (encrypted === 'encrypted_name_data') return Promise.resolve('Test User');
        return Promise.resolve(encrypted.replace('encrypted_', ''));
      });

      mockPrismaService.user.findUnique.mockResolvedValue(null); // Usuário não existe
      mockPrismaService.user.create.mockResolvedValue(dbUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(cryptoService.hashForSearch).toHaveBeenCalledWith(createUserDto.email);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailHash },
        select: { id: true },
      });

      // Verify that prisma.user.create was called
      expect(prismaService.user.create).toHaveBeenCalledTimes(1);

      expect(result).toEqual(expectedUser);
    });

    it('should throw error when user already exists', async () => {
      // Arrange
      const emailHash = 'deterministic_email_hash';
      const existingUser = { id: '123e4567-e89b-12d3-a456-426614174000' };

      mockCryptoService.hashForSearch.mockReturnValue(emailHash);
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        new HttpException('User already exists', HttpStatus.BAD_REQUEST),
      );
      expect(cryptoService.hashForSearch).toHaveBeenCalledWith(createUserDto.email);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { emailHash },
        select: { id: true },
      });
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const encryptedUsers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'encrypted_user1@example.com',
          name: 'encrypted_User One',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'encrypted_user2@example.com',
          name: 'encrypted_User Two',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const expectedUsers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user1@example.com',
          name: 'User One',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'user2@example.com',
          name: 'User Two',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCryptoService.decrypt.mockImplementation((encrypted: string): string => encrypted.replace('encrypted_', ''));
      mockPrismaService.user.findMany.mockResolvedValue(encryptedUsers);

      // Act
      const result = await service.findAll();

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(cryptoService.decrypt).toHaveBeenCalledTimes(4); // 2 users × 2 fields each
      expect(result).toEqual(expectedUsers);
    });

    it('should return empty array when no users exist', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(prismaService.user.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a user by id', async () => {
      // Arrange
      const encryptedUser = {
        id: userId,
        email: 'encrypted_test@example.com',
        name: 'encrypted_Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCryptoService.decrypt.mockImplementation((encrypted: string): string => encrypted.replace('encrypted_', ''));
      mockPrismaService.user.findUnique.mockResolvedValue(encryptedUser);

      // Act
      const result = await service.findOne(userId);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(cryptoService.decrypt).toHaveBeenCalledTimes(2); // email + name
      expect(result).toEqual(expectedUser);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(userId)).rejects.toThrow(new HttpException('User not found', HttpStatus.NOT_FOUND));
      expect(prismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
