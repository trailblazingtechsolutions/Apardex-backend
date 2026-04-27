import { PaymentProviderName } from './payment-provider.types';

export interface InitiateParams {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  bookingId: string;
  callbackUrl: string;
  channels?: string[];
  paymentOptions?: string;
}

export interface InitiateResult {
  paymentUrl: string;
  reference: string;
}

export interface VerifyResult {
  success: boolean;
  amount: number;
  currency: string;
  reference: string;
}

export interface IPaymentProvider {
  readonly providerName: PaymentProviderName;
  initiate(params: InitiateParams): Promise<InitiateResult>;
  verify(reference: string): Promise<VerifyResult>;
  validateWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
  ): boolean;
  getSuccessReference(body: Record<string, unknown>): string | null;
}
