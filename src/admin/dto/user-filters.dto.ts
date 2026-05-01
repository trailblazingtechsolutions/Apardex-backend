import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';
import { KycStatus } from '../../user/user.entity';

export class UserFiltersDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class HostFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: KycStatus })
  @IsEnum(KycStatus)
  @IsOptional()
  kycStatus?: KycStatus;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}
