import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';
import { PropertyStatus } from '../../property/property.entity';

export class PropertyFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsString()
  @IsOptional()
  location?: string;
}
