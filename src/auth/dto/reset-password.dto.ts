import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
