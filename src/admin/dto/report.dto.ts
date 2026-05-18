import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportOutputType, ReportType } from '../entities/admin-report.entity';

export class GenerateReportDto {
  @ApiProperty({ example: 'Monthly Financial Summary' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ enum: ReportType, default: ReportType.CUSTOM })
  @IsEnum(ReportType)
  @IsOptional()
  reportType?: ReportType;

  @ApiProperty({ enum: ReportOutputType })
  @IsEnum(ReportOutputType)
  outputType!: ReportOutputType;

  @ApiPropertyOptional({ example: '2024-10-01' })
  @IsDateString()
  @IsOptional()
  dateRangeStart?: string;

  @ApiPropertyOptional({ example: '2024-10-31' })
  @IsDateString()
  @IsOptional()
  dateRangeEnd?: string;
}
