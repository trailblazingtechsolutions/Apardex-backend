import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IPaymentProvider,
  InitiateParams,
  InitiateResult,
  VerifyResult,
} from '../payment-provider.interface';
import { PaymentProviderName } from '../payment-provider.types';

@Injectable()
export class PaystackProvider implements IPaymentProvider {
  readonly providerName = PaymentProviderName.PAYSTACK;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amount * 100),
        currency: params.currency,
        reference: params.reference,
        callback_url: params.callbackUrl,
        channels: params.channels,
        metadata: { bookingId: params.bookingId },
      }),
    });

    const data = (await res.json()) as {
      status: boolean;
      data: { authorization_url: string; reference: string };
    };

    if (!data.status) throw new Error('Paystack initiation failed');
    return {
      paymentUrl: data.data.authorization_url,
      reference: data.data.reference,
    };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });

    const data = (await res.json()) as {
      status: boolean;
      data: {
        status: string;
        amount: number;
        currency: string;
        reference: string;
      };
    };

    return {
      success: data.status && data.data.status === 'success',
      amount: data.data.amount / 100,
      currency: data.data.currency,
      reference: data.data.reference,
    };
  }

  validateWebhook(headers: Record<string, string>, rawBody: Buffer): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === headers['x-paystack-signature'];
  }

  getSuccessReference(body: Record<string, unknown>): string | null {
    if (body.event === 'charge.success') {
      const data = body.data as Record<string, unknown>;
      return (data.reference as string) ?? null;
    }
    return null;
  }
}
