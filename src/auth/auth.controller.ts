import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from '@/auth/auth.service';
import { AuthResponseDto } from '@/auth/dto/auth-response.dto';
import { LoginDto } from '@/auth/dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.signIn(loginDto.email, loginDto.password);
  }
}
