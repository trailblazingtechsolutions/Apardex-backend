import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('host_preferences')
export class HostPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host!: User;

  @Column({ unique: true })
  hostId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minPayoutAmount!: number;

  @Column({ default: 'USD' })
  payoutCurrency!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
