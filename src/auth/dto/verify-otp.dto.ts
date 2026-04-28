import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234', minLength: 4, maxLength: 4 })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  otp: string;
}
