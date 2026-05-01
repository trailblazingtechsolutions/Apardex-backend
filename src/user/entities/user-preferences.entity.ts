import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  userId!: string;

  // Regional
  @Column({ default: 'en' })
  language!: string;

  @Column({ default: 'USD' })
  currency!: string;

  @Column({ default: 'UTC' })
  timezone!: string;

  // Display
  @Column({ default: 'MM/DD/YYYY' })
  dateFormat!: string;

  @Column({ default: 'miles' })
  distanceUnit!: string;

  @Column({ default: false })
  darkMode!: boolean;

  // Search & Booking
  @Column({ default: true })
  showTotalPrice!: boolean;

  @Column({ default: false })
  petFriendly!: boolean;

  @Column({ default: false })
  instantBook!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;
}
