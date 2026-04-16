import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class HostRegisterDto {
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
  @IsNotEmpty()
  phoneNumber: string;
}
