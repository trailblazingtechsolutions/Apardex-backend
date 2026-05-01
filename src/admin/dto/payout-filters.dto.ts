import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';
import { HostPayoutStatus } from '../../host/entities/host-payout.entity';

export class PayoutFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: HostPayoutStatus })
  @IsEnum(HostPayoutStatus)
  @IsOptional()
  status?: HostPayoutStatus;
}

export class CreatePayoutDto {
  @ApiPropertyOptional({ example: 'host-uuid' })
  hostId!: string;

  @ApiPropertyOptional({ example: 450.0 })
  amount!: number;

  @ApiPropertyOptional({ example: 'USD' })
  currency!: string;

  @ApiPropertyOptional()
  @IsOptional()
  payoutMethodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  periodEnd?: string;
}
