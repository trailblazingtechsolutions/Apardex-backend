import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from '../entities/support-conversation.entity';

export class CreateConversationDto {
  @ApiProperty({ example: 'Issue with my booking payment' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ example: 'I was charged twice for booking #XYZ...' })
  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class ReplyMessageDto {
  @ApiProperty({ example: 'Thank you for reaching out. We are looking into this...' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class ConversationFiltersDto {
  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}
