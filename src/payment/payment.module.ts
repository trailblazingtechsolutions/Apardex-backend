import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { Booking } from '../booking/booking.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Booking]),
    ConfigModule,
    NotificationsModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaystackProvider, FlutterwaveProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
