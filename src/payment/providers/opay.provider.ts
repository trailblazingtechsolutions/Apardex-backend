/* eslint-disable @typescript-eslint/no-unused-vars */
import { NotImplementedException } from '@nestjs/common';
import {
  IPaymentProvider,
  InitiateParams,
  InitiateResult,
  VerifyResult,
} from '../payment-provider.interface';
import { PaymentProviderName } from '../payment-provider.types';

export class OpayProvider implements IPaymentProvider {
  readonly providerName = PaymentProviderName.OPAY;

  initiate(_params: InitiateParams): Promise<InitiateResult> {
    throw new NotImplementedException('OPay integration coming soon');
  }

  verify(_reference: string): Promise<VerifyResult> {
    throw new NotImplementedException('OPay integration coming soon');
  }

  validateWebhook(_headers: Record<string, string>, _rawBody: Buffer): boolean {
    throw new NotImplementedException('OPay integration coming soon');
  }

  getSuccessReference(_body: Record<string, unknown>): string | null {
    throw new NotImplementedException('OPay integration coming soon');
  }
}
