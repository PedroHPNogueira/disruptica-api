import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthGuard } from '@/auth/auth.guard';
import { PrismaService } from '@/prisma.service';
import { UsersController } from '@/users/users.controller';
import { UsersService } from '@/users/users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuthGuard, JwtService],
  exports: [UsersService],
})
export class UsersModule {}
