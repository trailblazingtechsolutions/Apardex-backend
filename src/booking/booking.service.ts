import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  activeHoldCondition,
  BLOCKING_BOOKING_STATUSES,
  Booking,
  BookingStatus,
  RESERVATION_HOLD_HOURS,
} from './booking.entity';
import { Property, PropertyStatus } from '../property/property.entity';
import { PropertyService } from '../property/property.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ModifyBookingDto } from './dto/modify-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

/** The set of rates a booking's price is calculated from. */
type RateCard = {
  rentPerNight: number;
  discountPercentage: number;
  cleaningFee: number;
  serviceFeePercentage: number;
  taxPercentage: number;
};

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly propertyService: PropertyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private calcNights(checkIn: string, checkOut: string): number {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /** The property's live rates — used only when a booking is first created. */
  private rateCardFromProperty(property: Property): RateCard {
    return {
      rentPerNight: Number(property.pricePerNight),
      discountPercentage: Number(property.discountPercentage ?? 0),
      cleaningFee: Number(property.cleaningFee ?? 0),
      serviceFeePercentage: Number(property.serviceFeePercentage ?? 0),
      taxPercentage: Number(property.taxPercentage ?? 0),
    };
  }

  /**
   * The rates this booking was agreed at. Recalculations go through here rather
   * than reading the property, which is what keeps a host's price change off an
   * existing booking.
   *
   * Bookings made before the snapshot columns existed carry no rate card, so it
   * is reconstructed from the amounts already charged — that reproduces the same
   * total for the same nights and scales correctly if the nights change.
   */
  private rateCardFromBooking(booking: Booking): RateCard {
    if (booking.rentPerNight !== null && booking.rentPerNight !== undefined) {
      return {
        rentPerNight: Number(booking.rentPerNight),
        discountPercentage: Number(booking.rateDiscountPercentage ?? 0),
        cleaningFee: Number(booking.cleaningFee ?? 0),
        serviceFeePercentage: Number(booking.rateServiceFeePercentage ?? 0),
        taxPercentage: Number(booking.rateTaxPercentage ?? 0),
      };
    }

    const basePrice = Number(booking.basePrice);
    const nights = Number(booking.nights) || 1;
    return {
      // The stored base is already discounted, so carry it as the net nightly
      // rate with no further discount applied.
      rentPerNight: basePrice / nights,
      discountPercentage: 0,
      cleaningFee: Number(booking.cleaningFee ?? 0),
      serviceFeePercentage: basePrice
        ? (Number(booking.serviceFee) / basePrice) * 100
        : 0,
      taxPercentage: basePrice ? (Number(booking.tax) / basePrice) * 100 : 0,
    };
  }

  /** Applies a rate card to a stay length. */
  private calcPricing(
    rate: RateCard,
    nights: number,
  ): {
    basePrice: number;
    cleaningFee: number;
    serviceFee: number;
    tax: number;
    totalPrice: number;
  } {
    const basePrice =
      rate.rentPerNight * (1 - rate.discountPercentage / 100) * nights;
    const serviceFee = (rate.serviceFeePercentage / 100) * basePrice;
    const tax = (rate.taxPercentage / 100) * basePrice;
    return {
      basePrice,
      cleaningFee: rate.cleaningFee,
      serviceFee,
      tax,
      totalPrice: basePrice + rate.cleaningFee + serviceFee + tax,
    };
  }

  /**
   * A reservation holds its dates until this deadline: 48 hours from now, but
   * never past the check-in day itself — you cannot still owe money for a stay
   * that has already started. Booking the day before check-in therefore gives a
   * shorter window than 48 hours.
   */
  private calcPaymentDueAt(checkIn: string): Date {
    const window = new Date(
      Date.now() + RESERVATION_HOLD_HOURS * 60 * 60 * 1000,
    );
    const endOfCheckInDay = new Date(`${checkIn}T23:59:59.000Z`);
    return window < endOfCheckInDay ? window : endOfCheckInDay;
  }

  /**
   * Dates are only taken by a booking that is either paid or still inside its
   * payment window. Anything unpaid and past due is treated as released, even
   * before releaseExpiredReservations() gets round to cancelling it — that gap
   * is what used to leave abandoned checkouts blocking a calendar forever.
   * COALESCE covers rows created before paymentDueAt existed.
   */
  private applyActiveHoldFilter(qb: SelectQueryBuilder<Booking>): void {
    qb.andWhere('b.status IN (:...blockingStatuses)', {
      blockingStatuses: BLOCKING_BOOKING_STATUSES,
    }).andWhere(activeHoldCondition('b'));
  }

  /** Finds a booking that still holds any part of the given range. */
  private async findBlockingBooking(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string,
  ): Promise<Booking | null> {
    const qb = this.bookingRepository
      .createQueryBuilder('b')
      .where('b.propertyId = :propertyId', { propertyId })
      .andWhere('b.checkIn < :checkOut AND b.checkOut > :checkIn', {
        checkIn,
        checkOut,
      });

    this.applyActiveHoldFilter(qb);

    if (excludeBookingId) {
      qb.andWhere('b.id != :excludeBookingId', { excludeBookingId });
    }

    return qb.getOne();
  }

  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    const property = await this.propertyService.findById(dto.propertyId);

    if (property.status !== PropertyStatus.ACTIVE) {
      throw new BadRequestException(
        'This property is not available for booking',
      );
    }

    if (dto.guests > property.maxGuests) {
      throw new BadRequestException(
        `This property allows max ${property.maxGuests} guests`,
      );
    }

    const nights = this.calcNights(dto.checkIn, dto.checkOut);
    if (nights < 1) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const today = new Date().toISOString().split('T')[0];
    if (dto.checkIn < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    const overlap = await this.findBlockingBooking(
      dto.propertyId,
      dto.checkIn,
      dto.checkOut,
    );

    if (overlap) {
      throw new BadRequestException(
        'Property is not available for the selected dates',
      );
    }

    const calendarFree = await this.propertyService.isAvailable(
      dto.propertyId,
      dto.checkIn,
      dto.checkOut,
    );
    if (!calendarFree) {
      throw new BadRequestException(
        'Property is blocked on some of the selected dates',
      );
    }

    // Locked in at reservation time: whatever the host does to the listing price
    // afterwards applies to the next guest, not this one.
    const rate = this.rateCardFromProperty(property);

    const booking = this.bookingRepository.create({
      userId,
      propertyId: dto.propertyId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      guests: dto.guests,
      nights,
      ...this.calcPricing(rate, nights),
      rentPerNight: rate.rentPerNight,
      rateDiscountPercentage: rate.discountPercentage,
      rateServiceFeePercentage: rate.serviceFeePercentage,
      rateTaxPercentage: rate.taxPercentage,
      paymentDueAt: this.calcPaymentDueAt(dto.checkIn),
    });

    return this.bookingRepository.save(booking);
  }

  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async markCompleted(id: string): Promise<Booking> {
    await this.bookingRepository.update(id, {
      status: BookingStatus.COMPLETED,
    });
    return this.findById(id);
  }

  async findUserBookings(
    userId: string,
    status?: BookingStatus,
  ): Promise<Booking[]> {
    const where = status ? { userId, status } : { userId };
    return this.bookingRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findHostBookings(
    hostId: string,
    status?: BookingStatus,
  ): Promise<Booking[]> {
    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.user', 'user')
      .where('property.hostId = :hostId', { hostId });

    if (status) query.andWhere('booking.status = :status', { status });

    return query.orderBy('booking.createdAt', 'DESC').getMany();
  }

  async cancel(id: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.findById(id);
    if (booking.userId !== userId)
      throw new ForbiddenException('Access denied');

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot cancel a ${booking.status} booking`,
      );
    }

    await this.bookingRepository.update(id, {
      status: BookingStatus.CANCELLED,
      cancellationReason: reason ?? null,
    });

    return this.findById(id);
  }

  async modify(
    id: string,
    userId: string,
    dto: ModifyBookingDto,
  ): Promise<Booking> {
    const booking = await this.findById(id);
    if (booking.userId !== userId)
      throw new ForbiddenException('Access denied');

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only pending or confirmed bookings can be modified',
      );
    }

    const checkIn = dto.checkIn ?? booking.checkIn;
    const checkOut = dto.checkOut ?? booking.checkOut;
    const nights = this.calcNights(checkIn, checkOut);

    if (nights < 1) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const datesChanged =
      checkIn !== booking.checkIn || checkOut !== booking.checkOut;

    if (datesChanged) {
      // Moving a booking has to clear the same checks as making one, otherwise
      // a guest can shift onto dates somebody else already holds.
      const today = new Date().toISOString().split('T')[0];
      if (checkIn < today) {
        throw new BadRequestException('Check-in date cannot be in the past');
      }

      const overlap = await this.findBlockingBooking(
        booking.propertyId,
        checkIn,
        checkOut,
        booking.id,
      );
      if (overlap) {
        throw new BadRequestException(
          'Property is not available for the selected dates',
        );
      }

      const calendarFree = await this.propertyService.isAvailable(
        booking.propertyId,
        checkIn,
        checkOut,
      );
      if (!calendarFree) {
        throw new BadRequestException(
          'Property is blocked on some of the selected dates',
        );
      }
    }

    // Priced from the booking's own locked rate card, never the property's
    // current rates — a repricing between booking and modification must not
    // reach this guest.
    const pricing = this.calcPricing(this.rateCardFromBooking(booking), nights);

    // A paid booking's price is settled. Anything that would move the amount
    // owed is refused rather than silently leaving a balance uncollected (or
    // overcharged), since there is no top-up or partial-refund flow yet.
    if (booking.isPaid && pricing.totalPrice !== Number(booking.totalPrice)) {
      throw new BadRequestException(
        'This booking is already paid, so it cannot be changed to a different length of stay. Please cancel and make a new reservation, or contact support.',
      );
    }

    await this.bookingRepository.update(id, {
      checkIn,
      checkOut,
      guests: dto.guests ?? booking.guests,
      nights,
      // Previously recomputed the nightly total only, silently dropping the
      // cleaning fee, service fee and tax that create() had charged.
      ...pricing,
      // An unpaid hold that moves to new dates gets its deadline recomputed,
      // since the cap depends on check-in. Paid bookings keep theirs.
      ...(booking.isPaid
        ? {}
        : { paymentDueAt: this.calcPaymentDueAt(checkIn) }),
    });

    return this.findById(id);
  }

  async confirmByHost(id: string, hostId: string): Promise<Booking> {
    const booking = await this.findById(id);

    if (booking.property.hostId !== hostId)
      throw new ForbiddenException('Access denied');

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    await this.bookingRepository.update(id, {
      status: BookingStatus.CONFIRMED,
    });

    await this.notificationsService.create(
      booking.userId,
      NotificationType.BOOKING_CONFIRMED,
      'Booking Confirmed',
      `Your booking for ${booking.property.title} has been confirmed by the host.`,
      id,
    );

    return this.findById(id);
  }

  async rejectByHost(
    id: string,
    hostId: string,
    reason?: string,
  ): Promise<Booking> {
    const booking = await this.findById(id);

    if (booking.property.hostId !== hostId)
      throw new ForbiddenException('Access denied');

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException('Cannot reject this booking');
    }

    await this.bookingRepository.update(id, {
      status: BookingStatus.CANCELLED,
      cancellationReason: reason ?? 'Rejected by host',
    });

    await this.notificationsService.create(
      booking.userId,
      NotificationType.BOOKING_CANCELLED,
      'Booking Rejected',
      `Your booking for ${booking.property.title} was rejected by the host.${reason ? ` Reason: ${reason}` : ''}`,
      id,
    );

    return this.findById(id);
  }

  /**
   * Cancels reservations whose payment window has closed, freeing the dates.
   * The availability queries already ignore expired holds, so this job is what
   * makes the release visible to the guest and the host rather than what
   * enforces it.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async releaseExpiredReservations(): Promise<{ released: number }> {
    const expired = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.isPaid = false')
      .andWhere('b.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere(
        `COALESCE(b."paymentDueAt", b."createdAt" + INTERVAL '${RESERVATION_HOLD_HOURS} hours') <= NOW()`,
      )
      .getMany();

    if (expired.length === 0) return { released: 0 };

    await this.bookingRepository.update(
      expired.map((b) => b.id),
      {
        status: BookingStatus.CANCELLED,
        cancellationReason:
          'Reservation expired — payment was not completed in time',
      },
    );

    for (const booking of expired) {
      void this.notificationsService.create(
        booking.userId,
        NotificationType.BOOKING_CANCELLED,
        'Reservation Expired',
        `Your reservation for ${booking.property?.title ?? 'a property'} was released because payment was not completed in time. The dates are open again if you still want them.`,
        booking.id,
      );
    }

    this.logger.log(`Released ${expired.length} expired reservation(s)`);
    return { released: expired.length };
  }

  async getHostRevenue(hostId: string) {
    const monthly = await this.bookingRepository
      .createQueryBuilder('b')
      .leftJoin('b.property', 'p')
      .select("TO_CHAR(b.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(b.totalPrice), 0)', 'revenue')
      .addSelect('COUNT(b.id)', 'bookings')
      .where('p.hostId = :hostId', { hostId })
      .andWhere('b.isPaid = true')
      .andWhere("b.createdAt >= NOW() - INTERVAL '12 months'")
      .groupBy("TO_CHAR(b.createdAt, 'YYYY-MM')")
      .orderBy("TO_CHAR(b.createdAt, 'YYYY-MM')", 'ASC')
      .getRawMany<{ month: string; revenue: string; bookings: string }>();

    return monthly.map((r) => ({
      month: r.month,
      revenue: parseFloat(r.revenue),
      bookings: parseInt(r.bookings),
    }));
  }
}
