import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsScheduler } from './notifications.scheduler';
import { UserNotificationPreferences } from '../user/entities/user-notification-preferences.entity';
import { Booking } from '../booking/booking.entity';
import { Review } from '../review/review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      UserNotificationPreferences,
      Booking,
      Review,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
