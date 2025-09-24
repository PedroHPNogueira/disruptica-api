import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { CryptoModule } from '@/crypto/crypto.module';
import { PrismaService } from '@/prisma.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [CryptoModule, UsersModule, AuthModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
