import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './booking.entity';
import { PropertyService } from '../property/property.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ModifyBookingDto } from './dto/modify-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class BookingService {
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

  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    const property = await this.propertyService.findById(dto.propertyId);

    if (dto.guests > property.maxGuests) {
      throw new BadRequestException(
        `This property allows max ${property.maxGuests} guests`,
      );
    }

    const nights = this.calcNights(dto.checkIn, dto.checkOut);
    if (nights < 1) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const overlap = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.propertyId = :propertyId', { propertyId: dto.propertyId })
      .andWhere('b.status IN (:...statuses)', {
        statuses: [
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.ACTIVE,
        ],
      })
      .andWhere('b.checkIn < :checkOut AND b.checkOut > :checkIn', {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
      })
      .getOne();

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

    const basePrice =
      Number(property.pricePerNight) *
      (1 - Number(property.discountPercentage) / 100) *
      nights;
    const cleaningFee = Number(property.cleaningFee ?? 0);
    const serviceFee = (Number(property.serviceFeePercentage ?? 0) / 100) * basePrice;
    const tax = (Number(property.taxPercentage ?? 0) / 100) * basePrice;
    const totalPrice = basePrice + cleaningFee + serviceFee + tax;

    const booking = this.bookingRepository.create({
      userId,
      propertyId: dto.propertyId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      guests: dto.guests,
      nights,
      basePrice,
      cleaningFee,
      serviceFee,
      tax,
      totalPrice,
    });

    return this.bookingRepository.save(booking);
  }

  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
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

    const property = await this.propertyService.findById(booking.propertyId);
    const discounted =
      property.pricePerNight * (1 - property.discountPercentage / 100);

    await this.bookingRepository.update(id, {
      checkIn,
      checkOut,
      guests: dto.guests ?? booking.guests,
      nights,
      totalPrice: discounted * nights,
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
