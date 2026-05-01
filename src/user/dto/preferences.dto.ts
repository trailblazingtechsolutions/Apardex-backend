import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'MM/DD/YYYY' })
  @IsString()
  @IsOptional()
  dateFormat?: string;

  @ApiPropertyOptional({ example: 'miles' })
  @IsString()
  @IsOptional()
  distanceUnit?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  darkMode?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showTotalPrice?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  petFriendly?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  instantBook?: boolean;
}
