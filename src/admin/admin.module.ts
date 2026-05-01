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
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      Property,
      Booking,
      Payment,
      HostPayout,
      Dispute,
      AdminReport,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
