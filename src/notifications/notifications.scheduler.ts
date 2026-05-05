import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from '../booking/booking.entity';
import { Review } from '../review/review.entity';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notification.entity';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Runs every day at 8:00 AM UTC
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendCheckInReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const bookings = await this.bookingRepository.find({
      where: { checkIn: dateStr, status: BookingStatus.CONFIRMED },
    });

    this.logger.log(`Check-in reminders: ${bookings.length} bookings tomorrow`);

    for (const booking of bookings) {
      await this.notificationsService.create(
        booking.userId,
        NotificationType.CHECKIN_REMINDER,
        'Check-in Tomorrow',
        `Reminder: your stay at ${booking.property.title} begins tomorrow. Check-in is at ${booking.property.checkInTime}.`,
        booking.id,
      );
    }
  }

  // Runs every day at 9:00 AM UTC
  @Cron('0 9 * * *')
  async sendCheckOutReminders() {
    const today = new Date().toISOString().split('T')[0];

    const bookings = await this.bookingRepository.find({
      where: { checkOut: today, status: BookingStatus.ACTIVE },
    });

    this.logger.log(`Check-out reminders: ${bookings.length} bookings today`);

    for (const booking of bookings) {
      await this.notificationsService.create(
        booking.userId,
        NotificationType.GENERAL,
        'Check-out Today',
        `Your stay at ${booking.property.title} ends today. Check-out is by ${booking.property.checkOutTime}.`,
        booking.id,
      );
    }
  }

  // Runs every day at 10:00 AM UTC
  @Cron('0 10 * * *')
  async sendReviewPrompts() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const bookings = await this.bookingRepository.find({
      where: { checkOut: dateStr, status: BookingStatus.COMPLETED },
    });

    this.logger.log(`Review prompts: checking ${bookings.length} completed stays`);

    for (const booking of bookings) {
      const alreadyReviewed = await this.reviewRepository.findOne({
        where: { bookingId: booking.id, userId: booking.userId },
      });
      if (alreadyReviewed) continue;

      await this.notificationsService.create(
        booking.userId,
        NotificationType.REVIEW_PROMPT,
        'How was your stay?',
        `You stayed at ${booking.property.title}. Share your experience — it helps other travellers.`,
        booking.id,
      );
    }
  }
}
