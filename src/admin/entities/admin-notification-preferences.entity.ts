import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('admin_notification_preferences')
export class AdminNotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  adminId!: string;

  // Email
  @Column({ default: true })
  emailNewHostRegistration!: boolean;

  @Column({ default: true })
  emailDisputesAndFlags!: boolean;

  @Column({ default: true })
  emailPlatformPayouts!: boolean;

  @Column({ default: false })
  emailMarketingUpdates!: boolean;

  // Push & In-App
  @Column({ default: true })
  pushDirectMessages!: boolean;

  @Column({ default: true })
  pushSystemAlerts!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;
}
