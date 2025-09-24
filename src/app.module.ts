import { Module } from '@nestjs/common';

import { CryptoModule } from '@/crypto/crypto.module';
import { PrismaService } from '@/prisma.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [CryptoModule, UsersModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
