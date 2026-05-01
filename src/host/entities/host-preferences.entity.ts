import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('host_preferences')
export class HostPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  hostId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minPayoutAmount!: number;

  @Column({ default: 'USD' })
  payoutCurrency!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
