import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockDatesDto {
  @ApiProperty({
    example: ['2025-12-24', '2025-12-25'],
    description: 'Dates to block in YYYY-MM-DD format',
  })
  @IsArray()
  @IsDateString({}, { each: true })
  dates!: string[];

  @ApiPropertyOptional({ example: 'Personal use' })
  @IsString()
  @IsOptional()
  reason?: string;
}
