import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthResponseDto } from '@/auth/dto/auth-response.dto';
import { CryptoService } from '@/crypto/crypto.service';
import { PrismaService } from '@/prisma.service';
import { UsersService } from '@/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private cryptoService: CryptoService,
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string): Promise<AuthResponseDto> {
    //Validate if user exists
    const emailHash = this.cryptoService.hashForSearch(email);
    const user = await this.prismaService.user.findUnique({
      where: { emailHash },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });
    if (!user) throw new HttpException('Email or password is incorrect', HttpStatus.BAD_REQUEST);

    //validate password
    const isPasswordValid = await this.cryptoService.comparePassword(password, user?.password);
    if (!isPasswordValid) throw new HttpException('Email or password is incorrect', HttpStatus.BAD_REQUEST);

    // Decrypt user data for token payload
    const decryptedEmail = await this.cryptoService.decrypt(user.email);
    const decryptedName = await this.cryptoService.decrypt(user.name);

    //generate token
    const payload = {
      sub: user.id,
      email: decryptedEmail,
      name: decryptedName,
      iat: Math.floor(Date.now() / 1000),
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400,
    };
  }
}
