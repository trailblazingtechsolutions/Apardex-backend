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

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed bookings');
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

  async findByProperty(propertyId: string): Promise<Review[]> {
    const property = await this.propertyService.findById(propertyId);
    if (!property) throw new NotFoundException('Property not found');

    return this.reviewRepository.find({
      where: { propertyId },
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
