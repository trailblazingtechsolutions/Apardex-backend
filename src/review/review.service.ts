import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { BookingService } from '../booking/booking.service';
import { BookingStatus } from '../booking/booking.entity';
import { PropertyService } from '../property/property.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly bookingService: BookingService,
    private readonly propertyService: PropertyService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const booking = await this.bookingService.findById(dto.bookingId);

    if (booking.userId !== userId) {
      throw new BadRequestException('You can only review your own bookings');
    }

    // A booking is reviewable once the stay is over. Because nothing
    // auto-transitions bookings to COMPLETED, we also treat a confirmed/active
    // booking whose check-out date has passed as reviewable.
    const stayEnded = this.hasStayEnded(booking.checkOut);
    const reviewable =
      booking.status === BookingStatus.COMPLETED ||
      (stayEnded &&
        (booking.status === BookingStatus.CONFIRMED ||
          booking.status === BookingStatus.ACTIVE));

    if (!reviewable) {
      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('You cannot review a cancelled booking');
      }
      if (!stayEnded) {
        throw new BadRequestException(
          'You can only review a booking after your stay has ended',
        );
      }
      throw new BadRequestException('You can only review completed bookings');
    }

    // Sync the stored status so it reflects the completed stay going forward.
    if (booking.status !== BookingStatus.COMPLETED) {
      await this.bookingService.markCompleted(booking.id);
    }

    if (booking.property?.hostId === userId) {
      throw new BadRequestException('You cannot review your own property');
    }

    const existing = await this.reviewRepository.findOne({
      where: { bookingId: dto.bookingId },
    });
    if (existing)
      throw new ConflictException('You already reviewed this booking');

    const review = this.reviewRepository.create({ ...dto, userId });
    const saved = await this.reviewRepository.save(review);

    await this.updatePropertyRating(dto.propertyId);

    return saved;
  }

  private hasStayEnded(checkOut: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(checkOut).getTime() <= today.getTime();
  }

  async findByProperty(propertyId: string): Promise<Review[]> {
    const property = await this.propertyService.findById(propertyId);
    if (!property) throw new NotFoundException('Property not found');

    return this.reviewRepository.find({
      where: { propertyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByHost(hostId: string): Promise<Review[]> {
    return this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.property', 'property')
      .leftJoinAndSelect('review.user', 'user')
      .where('property.hostId = :hostId', { hostId })
      .orderBy('review.createdAt', 'DESC')
      .getMany();
  }

  async findByUser(userId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private async updatePropertyRating(propertyId: string): Promise<void> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.propertyId = :propertyId', { propertyId })
      .getRawOne<{ avg: string; count: string }>();

    await this.propertyService.updateStatus(
      propertyId,
      (await this.propertyService.findById(propertyId)).status,
    );

    await this.reviewRepository.manager.update('properties', propertyId, {
      avgRating: parseFloat(result?.avg ?? '0'),
      totalReviews: parseInt(result?.count ?? '0'),
    });
  }
}
