import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_notification_preferences')
export class UserNotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  userId!: string;

  // Email
  @Column({ default: true })
  emailBookingUpdates!: boolean;

  @Column({ default: true })
  emailHostMessages!: boolean;

  @Column({ default: true })
  emailAccountAlerts!: boolean;

  @Column({ default: false })
  emailPromotions!: boolean;

  // Push
  @Column({ default: true })
  pushEnabled!: boolean;

  @Column({ default: true })
  pushCheckInReminders!: boolean;

  @Column({ default: false })
  pushPriceDrops!: boolean;

  // SMS
  @Column({ default: true })
  smsUrgentBooking!: boolean;

  @Column({ default: true })
  smsHostEmergencies!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;
}
