import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-of-property' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: '2026-05-07' })
  @IsDateString()
  checkOut: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  guests: number;
}
