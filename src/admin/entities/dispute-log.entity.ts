import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum DisputeLogAction {
  CREATED = 'created',
  SET_UNDER_REVIEW = 'set_under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  LOCKED = 'locked',
  REFUND_FULL = 'refund_full',
  REFUND_PARTIAL = 'refund_partial',
}

@Entity('dispute_logs')
export class DisputeLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  disputeId!: string;

  @Column({ type: 'varchar', nullable: true })
  adminId!: string | null;

  @Column({ type: 'enum', enum: DisputeLogAction })
  action!: DisputeLogAction;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
