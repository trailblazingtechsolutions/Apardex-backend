import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DisputePriority,
  DisputeStatus,
  DisputeType,
} from '../entities/dispute.entity';
import { PaginationDto } from './pagination.dto';

export class CreateDisputeDto {
  @ApiProperty({ enum: DisputeType })
  @IsEnum(DisputeType)
  type!: DisputeType;

  @ApiProperty({ enum: DisputePriority })
  @IsEnum(DisputePriority)
  priority!: DisputePriority;

  @ApiProperty({ example: 'Property condition does not match listing photos.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hostId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  guestId?: string;
}

export class ResolveDisputeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resolution?: string;
}

export class RefundDto {
  @ApiProperty({ example: 100.0 })
  amount!: number;

  @ApiPropertyOptional({ example: 'Partial refund for cleaning issue' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class IssueRefundDto {
  @ApiPropertyOptional({ example: 150.00, description: 'Omit for full refund' })
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 'Property condition misrepresented' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class DisputeFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DisputeStatus })
  @IsEnum(DisputeStatus)
  @IsOptional()
  status?: DisputeStatus;

  @ApiPropertyOptional({ enum: DisputeType })
  @IsEnum(DisputeType)
  @IsOptional()
  type?: DisputeType;

  @ApiPropertyOptional({ enum: DisputePriority })
  @IsEnum(DisputePriority)
  @IsOptional()
  priority?: DisputePriority;
}
