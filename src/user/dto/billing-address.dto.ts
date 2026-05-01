import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BillingAddressDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '123 Main Street, Abuja Nigeria' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ example: 'Abuja' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'Abuja' })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country!: string;
}
