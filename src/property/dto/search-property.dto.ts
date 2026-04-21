import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PropertyType } from '../property.entity';

export class SearchPropertyDto {
  @ApiPropertyOptional({ example: 'Lagos' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsString()
  @IsOptional()
  checkIn?: string;

  @ApiPropertyOptional({ example: '2026-05-07' })
  @IsString()
  @IsOptional()
  checkOut?: string;

  @ApiPropertyOptional({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  guests?: number;

  @ApiPropertyOptional({ example: 50 })
  @Type(() => Number)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 500 })
  @Type(() => Number)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
