/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentProvider,
  InitiateParams,
  InitiateResult,
  VerifyResult,
} from '../payment-provider.interface';
import { PaymentProviderName } from '../payment-provider.types';

@Injectable()
export class FlutterwaveProvider implements IPaymentProvider {
  readonly providerName = PaymentProviderName.FLUTTERWAVE;
  private readonly secretKey: string;
  private readonly secretHash: string;
  private readonly baseUrl = 'https://api.flutterwave.com/v3';

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('FLUTTERWAVE_SECRET_KEY', '');
    this.secretHash = config.get<string>('FLUTTERWAVE_SECRET_HASH', '');
  }

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const res = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amount,
        currency: params.currency,
        redirect_url: params.callbackUrl,
        payment_options: params.paymentOptions,
        customer: { email: params.email },
        meta: { bookingId: params.bookingId },
      }),
    });

    const data = (await res.json()) as {
      status: string;
      data: { link: string };
    };

    if (data.status !== 'success')
      throw new Error('Flutterwave initiation failed');
    return {
      paymentUrl: data.data.link,
      reference: params.reference,
    };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(
      `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const data = (await res.json()) as {
      status: string;
      data: {
        status: string;
        amount: number;
        currency: string;
        tx_ref: string;
      };
    };

    return {
      success: data.status === 'success' && data.data.status === 'successful',
      amount: data.data.amount,
      currency: data.data.currency,
      reference: data.data.tx_ref,
    };
  }

  validateWebhook(headers: Record<string, string>, _rawBody: Buffer): boolean {
    return headers['verif-hash'] === this.secretHash;
  }

  getSuccessReference(body: Record<string, unknown>): string | null {
    if (body.event === 'charge.completed') {
      const data = body.data as Record<string, unknown>;
      if (data.status === 'successful') {
        return (data.tx_ref as string) ?? null;
      }
    }
    return null;
  }
}
