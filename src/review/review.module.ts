import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { BookingModule } from '../booking/booking.module';
import { PropertyModule } from '../property/property.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review]), BookingModule, PropertyModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
