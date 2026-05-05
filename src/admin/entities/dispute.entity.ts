import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DisputeType {
  GUEST_COMPLAINT = 'guest_complaint',
  COMMUNICATION = 'communication',
  PROPERTY_DAMAGE = 'property_damage',
  BILLING_REFUNDS = 'billing_refunds',
  SAFETY_FLAG = 'safety_flag',
  FRAUD_REPORT = 'fraud_report',
}

export enum DisputePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum DisputeStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  ticketId!: string;

  @Column({ type: 'enum', enum: DisputeType })
  type!: DisputeType;

  @Column({ type: 'enum', enum: DisputePriority, default: DisputePriority.MEDIUM })
  priority!: DisputePriority;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status!: DisputeStatus;

  @Column()
  reportedById!: string;

  @Column({ type: 'varchar', nullable: true })
  bookingId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  propertyId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  hostId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  guestId!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ default: false })
  isLocked!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  payoutId!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
