import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CryptoService } from '@/crypto/crypto.service';
import { PrismaService } from '@/prisma.service';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { UserResponseDto } from '@/users/dto/user-response.dto';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    //Validate if user already exists
    const encryptedEmail = await this.cryptoService.encrypt(createUserDto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: encryptedEmail },
      select: {
        id: true,
      },
    });
    if (existingUser) throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(createUserDto.password, this.saltRounds);

    // Encrypt sensitive fields
    const encryptedName = await this.cryptoService.encrypt(createUserDto.name);

    const user = await this.prisma.user.create({
      data: {
        email: encryptedEmail,
        password: hashedPassword,
        name: encryptedName,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Decrypt fields for response
    const decryptedEmail = await this.cryptoService.decrypt(user.email);
    const decryptedName = await this.cryptoService.decrypt(user.name);

    return {
      ...user,
      email: decryptedEmail,
      name: decryptedName,
    };
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Decrypt sensitive fields for all users
    return Promise.all(
      users.map(async (user) => {
        const decryptedEmail = await this.cryptoService.decrypt(user.email);
        const decryptedName = await this.cryptoService.decrypt(user.name);

        return {
          ...user,
          email: decryptedEmail,
          name: decryptedName,
        };
      }),
    );
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    // Decrypt sensitive fields for response
    const decryptedEmail = await this.cryptoService.decrypt(user.email);
    const decryptedName = await this.cryptoService.decrypt(user.name);

    return {
      ...user,
      email: decryptedEmail,
      name: decryptedName,
    };
  }
}
