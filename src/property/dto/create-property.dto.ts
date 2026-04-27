import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationPolicy, PropertyType } from '../property.entity';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Luxury Apartment in Lagos' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A beautiful apartment with ocean view...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.APARTMENT })
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiProperty({ example: '12 Victoria Island' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Lagos State' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  pricePerNight: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPercentage?: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  maxGuests: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  bedrooms: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  bathrooms: number;

  @ApiPropertyOptional({ example: ['WiFi', 'Pool', 'Gym', 'Parking'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @ApiPropertyOptional({ example: ['No smoking', 'No pets'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  houseRules?: string[];

  @ApiPropertyOptional({
    enum: CancellationPolicy,
    example: CancellationPolicy.MODERATE,
  })
  @IsEnum(CancellationPolicy)
  @IsOptional()
  cancellationPolicy?: CancellationPolicy;

  @ApiPropertyOptional({ example: '14:00' })
  @IsString()
  @IsOptional()
  checkInTime?: string;

  @ApiPropertyOptional({ example: '11:00' })
  @IsString()
  @IsOptional()
  checkOutTime?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cleaningFee?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  serviceFeePercentage?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxPercentage?: number;

  @ApiPropertyOptional({ example: 6.4603 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 3.3841 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  instantBook?: boolean;
}
