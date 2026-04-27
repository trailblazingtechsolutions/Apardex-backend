import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './payment.entity';
import { PaymentProviderName } from './payment-provider.types';
import { IPaymentProvider } from './payment-provider.interface';
import { InitiatePaymentDto, PaymentMethod } from './dto/initiate-payment.dto';
import { Booking, BookingStatus } from '../booking/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';

@Injectable()
export class PaymentService {
  private readonly providers: Map<string, IPaymentProvider>;
  private readonly defaultCallbackUrl: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly paystackProvider: PaystackProvider,
    private readonly flutterwaveProvider: FlutterwaveProvider,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.providers = new Map<string, IPaymentProvider>([
      [PaymentProviderName.PAYSTACK, paystackProvider],
      [PaymentProviderName.FLUTTERWAVE, flutterwaveProvider],
    ]);
    this.defaultCallbackUrl = config.get<string>(
      'PAYMENT_CALLBACK_URL',
      'https://apardex.com/payment/callback',
    );
  }

  private getProvider(name: string): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(`Unsupported provider: ${name}`);
    }
    return provider;
  }

  private generateReference(): string {
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `APX-${ts}-${rand}`;
  }

  async initiate(userId: string, userEmail: string, dto: InitiatePaymentDto) {
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId, userId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.isPaid) {
      throw new BadRequestException('Booking is already paid');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled booking');
    }

    // Route to provider based on payment method + currency
    let providerName: PaymentProviderName;
    let channels: string[] | undefined;
    let paymentOptions: string | undefined;

    if (dto.paymentMethod === PaymentMethod.APPLE_PAY) {
      providerName = PaymentProviderName.FLUTTERWAVE;
      paymentOptions = 'applepay';
    } else if (dto.paymentMethod === PaymentMethod.BANK_TRANSFER) {
      providerName =
        dto.currency === 'NGN'
          ? PaymentProviderName.PAYSTACK
          : PaymentProviderName.FLUTTERWAVE;
      channels = ['bank_transfer'];
      paymentOptions = 'banktransfer';
    } else {
      // card — Paystack for NGN, Flutterwave for international
      providerName =
        dto.currency === 'NGN'
          ? PaymentProviderName.PAYSTACK
          : PaymentProviderName.FLUTTERWAVE;
      channels = ['card'];
      paymentOptions = 'card';
    }

    const provider = this.getProvider(providerName);
    const reference = this.generateReference();
    const callbackUrl = dto.callbackUrl ?? this.defaultCallbackUrl;

    const result = await provider.initiate({
      email: userEmail,
      amount: Number(booking.totalPrice),
      currency: dto.currency,
      reference,
      bookingId: booking.id,
      callbackUrl,
      channels,
      paymentOptions,
    });

    await this.paymentRepository.save(
      this.paymentRepository.create({
        bookingId: booking.id,
        userId,
        provider: providerName as PaymentProviderName,
        currency: dto.currency,
        amount: Number(booking.totalPrice),
        reference,
        status: PaymentStatus.PENDING,
      }),
    );

    await this.bookingRepository.update(booking.id, {
      paymentReference: reference,
      paymentProvider: providerName as PaymentProviderName,
    });

    return {
      paymentUrl: result.paymentUrl,
      reference,
      providerUsed: providerName,
      paymentMethod: dto.paymentMethod,
    };
  }

  async handleWebhook(
    providerName: string,
    headers: Record<string, string>,
    rawBody: Buffer,
    body: Record<string, unknown>,
  ): Promise<void> {
    const provider = this.getProvider(providerName);

    if (!provider.validateWebhook(headers, rawBody)) return;

    const reference = provider.getSuccessReference(body);
    if (!reference) return;

    const payment = await this.paymentRepository.findOne({
      where: { reference },
    });
    if (!payment || payment.status === PaymentStatus.SUCCESS) return;

    const verified = await provider.verify(reference);
    if (!verified.success) {
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.FAILED,
      });
      return;
    }

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.SUCCESS,
      metadata: body as object,
    });

    await this.bookingRepository.update(payment.bookingId, {
      isPaid: true,
      status: BookingStatus.CONFIRMED,
    });

    await this.notificationsService.create(
      payment.userId,
      NotificationType.PAYMENT_RECEIVED,
      'Payment Confirmed',
      `Your payment of ${verified.currency} ${verified.amount} has been received. Your booking is now confirmed.`,
      payment.bookingId,
    );
  }

  async findByBooking(bookingId: string, userId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { bookingId, userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async findMyPayments(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
