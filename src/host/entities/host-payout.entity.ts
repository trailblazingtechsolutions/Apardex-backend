import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum HostPayoutStatus {
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

@Entity('host_payouts')
export class HostPayout {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  hostId!: string;

  @Column({ type: 'varchar', nullable: true })
  payoutMethodId!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ default: 'USD' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: HostPayoutStatus,
    default: HostPayoutStatus.PROCESSING,
  })
  status!: HostPayoutStatus;

  @Column({ type: 'date', nullable: true })
  periodStart!: Date | null;

  @Column({ type: 'date', nullable: true })
  periodEnd!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
