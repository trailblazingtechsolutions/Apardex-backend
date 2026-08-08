import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './property.entity';
import { PropertyAvailability } from './property-availability.entity';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Booking } from '../booking/booking.entity';

@Module({
  imports: [
    // Booking is registered for the public availability calendar; the entity is
    // used directly rather than importing BookingModule, which would be a cycle.
    TypeOrmModule.forFeature([Property, PropertyAvailability, Booking]),
    CloudinaryModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyService],
  exports: [PropertyService],
})
export class PropertyModule {}
