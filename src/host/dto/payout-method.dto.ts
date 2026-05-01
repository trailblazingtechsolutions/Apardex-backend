import { IsEnum, IsOptional, IsEmail, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMethodType } from '../entities/host-payout-method.entity';

export class AddPayoutMethodDto {
  @ApiProperty({ example: 'bank_account', enum: PayoutMethodType })
  @IsEnum(PayoutMethodType)
  type!: PayoutMethodType;

  @ApiPropertyOptional({ example: 'Guaranty Trust Bank' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ example: '058' })
  @IsString()
  @IsOptional()
  bankCode?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiPropertyOptional({ example: 'host@example.com' })
  @IsEmail()
  @IsOptional()
  walletEmail?: string;
}
