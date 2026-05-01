import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class KycActionDto {
  @ApiPropertyOptional({ example: 'Name mismatch detected' })
  @IsString()
  @IsOptional()
  reason?: string;
}
