import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { Booking } from '../booking/booking.entity';
import { Favorite } from '../favorites/favorite.entity';
import { Message } from '../messaging/message.entity';
import { Notification } from '../notifications/notification.entity';
import { Property } from '../property/property.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Booking, Favorite, Message, Notification, Property]),
    CloudinaryModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
