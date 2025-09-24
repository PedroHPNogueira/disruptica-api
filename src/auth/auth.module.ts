import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from '@/auth/auth.controller';
import { AuthGuard } from '@/auth/auth.guard';
import { AuthService } from '@/auth/auth.service';
import { CryptoService } from '@/crypto/crypto.service';
import { PrismaService } from '@/prisma.service';
import { UsersService } from '@/users/users.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, UsersService, PrismaService, CryptoService],
  exports: [AuthGuard],
})
export class AuthModule {}
