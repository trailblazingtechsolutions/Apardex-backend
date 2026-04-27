import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  APPLE_PAY = 'apple_pay',
}

export const SUPPORTED_CURRENCIES = [
  'NGN',
  'USD',
  'GBP',
  'EUR',
  'GHS',
  'KES',
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export class InitiatePaymentDto {
  @ApiProperty({ example: 'uuid-of-booking' })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    description:
      'Payment method chosen by the user. Backend picks the provider automatically.',
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: 'NGN', enum: SUPPORTED_CURRENCIES })
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: SupportedCurrency;

  @ApiPropertyOptional({ example: 'https://apardex.com/payment/callback' })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}
