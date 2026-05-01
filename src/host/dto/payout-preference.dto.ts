import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PayoutPreferenceDto {
  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPayoutAmount?: number;

  @ApiPropertyOptional({ example: 'USD', enum: ['USD', 'NGN', 'GBP', 'EUR', 'CAD', 'AUD'] })
  @IsString()
  @IsOptional()
  payoutCurrency?: string;
}
