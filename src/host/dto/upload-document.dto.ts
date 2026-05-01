import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiPropertyOptional({
    example: 'government_id',
    enum: ['government_id', 'certificate_of_occupancy', 'utility_bill', 'other'],
  })
  @IsString()
  @IsOptional()
  documentType?: string;
}
