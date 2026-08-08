import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../user/user.entity';
import { Property } from '../property/property.entity';
import { Booking } from '../booking/booking.entity';
import { Payment } from '../payment/payment.entity';
import { HostPayout } from '../host/entities/host-payout.entity';
import { Dispute } from './entities/dispute.entity';
import { AdminReport } from './entities/admin-report.entity';
import { HostDocument } from '../host/entities/host-document.entity';
import { DisputeLog } from './entities/dispute-log.entity';
import { AdminNotificationPreferences } from './entities/admin-notification-preferences.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupportModule } from '../support/support.module';
import { UserModule } from '../user/user.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    SupportModule,
    UserModule,
    MailerModule,
    TypeOrmModule.forFeature([
      User,
      Property,
      Booking,
      Payment,
      HostPayout,
      Dispute,
      AdminReport,
      HostDocument,
      DisputeLog,
      AdminNotificationPreferences,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
