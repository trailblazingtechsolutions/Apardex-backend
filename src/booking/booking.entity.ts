import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Property } from '../property/property.entity';
import { PaymentProviderName } from '../payment/payment-provider.types';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** Hours a guest has to pay before their reserved dates are released. */
export const RESERVATION_HOLD_HOURS = 48;

/** Statuses whose date range can still occupy a property. */
export const BLOCKING_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.ACTIVE,
];

/**
 * SQL predicate for "this booking still holds its dates": either it is paid, or
 * its payment window is open. Shared by BookingService (booking creation) and
 * PropertyService (the public calendar) so availability can never disagree
 * between what the calendar shows and what booking actually allows.
 * COALESCE covers rows created before paymentDueAt existed.
 */
export const activeHoldCondition = (alias: string): string =>
  `(${alias}."isPaid" = true OR COALESCE(${alias}."paymentDueAt", ${alias}."createdAt" + INTERVAL '${RESERVATION_HOLD_HOURS} hours') > NOW())`;

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Property, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @Column()
  propertyId!: string;

  @Column({ type: 'date' })
  checkIn!: string;

  @Column({ type: 'date' })
  checkOut!: string;

  @Column({ type: 'int' })
  guests!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cleaningFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  serviceFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({ type: 'int' })
  nights!: number;

  // ─── Locked rate card ───────────────────────────────────────────────────────
  // The property's rates as they stood when this booking was made. Every later
  // recalculation uses these, never the property's current values, so a host
  // repricing their listing only affects guests who book after the change.
  // Null on bookings created before the snapshot existed — BookingService
  // reconstructs those from the stored amounts.

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rentPerNight!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rateDiscountPercentage!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rateServiceFeePercentage!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rateTaxPercentage!: number | null;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status!: BookingStatus;

  @Column({ type: 'varchar', nullable: true })
  cancellationReason!: string | null;

  @Column({ default: false })
  isPaid!: boolean;

  /**
   * Deadline for paying a reservation. Until it passes, the dates are held; once
   * it passes on an unpaid booking the dates are free again and the booking is
   * cancelled by BookingService.releaseExpiredReservations().
   */
  @Column({ type: 'timestamp', nullable: true })
  paymentDueAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  paymentReference!: string | null;

  @Column({ type: 'enum', enum: PaymentProviderName, nullable: true })
  paymentProvider!: PaymentProviderName | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
