import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class UserRegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
