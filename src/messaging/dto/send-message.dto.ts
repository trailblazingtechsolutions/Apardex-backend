import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'uuid-of-receiver' })
  @IsUUID()
  receiverId: string;

  @ApiPropertyOptional({ example: 'uuid-of-property' })
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @ApiProperty({ example: 'Hi, is this property available next week?' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
