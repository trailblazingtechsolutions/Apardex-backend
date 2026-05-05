import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { UserNotificationPreferences } from '../user/entities/user-notification-preferences.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserNotificationPreferences)
    private readonly notifPrefsRepository: Repository<UserNotificationPreferences>,
  ) {}

  private async isAllowed(userId: string, type: NotificationType): Promise<boolean> {
    const prefs = await this.notifPrefsRepository.findOne({ where: { userId } });
    if (!prefs) return true;

    if (!prefs.pushEnabled) return false;

    if (type === NotificationType.CHECKIN_REMINDER) return prefs.pushCheckInReminders;

    return true;
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    referenceId?: string,
  ): Promise<Notification | null> {
    const allowed = await this.isAllowed(userId, type);
    if (!allowed) return null;

    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      body,
      referenceId: referenceId ?? null,
    });
    return this.notificationRepository.save(notification);
  }

  async findAll(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async markOneRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (!notification.isRead) {
      await this.notificationRepository.update(id, { isRead: true });
    }
  }
}
