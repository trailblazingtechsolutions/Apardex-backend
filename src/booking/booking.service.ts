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

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly propertyService: PropertyService,
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

    const discounted =
      property.pricePerNight * (1 - property.discountPercentage / 100);
    const totalPrice = discounted * nights;

    const booking = this.bookingRepository.create({
      userId,
      propertyId: dto.propertyId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      guests: dto.guests,
      nights,
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
}
