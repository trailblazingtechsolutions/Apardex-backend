import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SocialAuthDto {
  @ApiProperty({
    description:
      'The Google ID token obtained from the client-side Google Sign-In SDK.',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
