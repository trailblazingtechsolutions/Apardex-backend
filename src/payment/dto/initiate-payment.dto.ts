import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProviderName } from '../payment-provider.types';

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
    enum: [PaymentProviderName.PAYSTACK, PaymentProviderName.FLUTTERWAVE],
    description:
      'Preferred provider. Non-NGN payments are automatically routed to Flutterwave.',
  })
  @IsEnum([PaymentProviderName.PAYSTACK, PaymentProviderName.FLUTTERWAVE])
  provider!: PaymentProviderName.PAYSTACK | PaymentProviderName.FLUTTERWAVE;

  @ApiProperty({ example: 'NGN', enum: SUPPORTED_CURRENCIES })
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: SupportedCurrency;

  @ApiPropertyOptional({ example: 'https://apardex.com/payment/callback' })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}
