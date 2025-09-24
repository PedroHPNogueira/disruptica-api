import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access token',
    example: 'token',
  })
  access_token!: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  token_type!: string;

  @ApiProperty({
    description: 'Expires in',
    example: 86400,
  })
  expires_in!: number;
}
