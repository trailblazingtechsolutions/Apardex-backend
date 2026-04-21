import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { ChangePasswordDto } from './dto/update-profile.dto';
import { Booking, BookingStatus } from '../booking/booking.entity';
import { Favorite } from '../favorites/favorite.entity';
import { Message } from '../messaging/message.entity';
import { Notification } from '../notifications/notification.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.userRepository.update(id, data);
    return this.findById(id);
  }

  async updateWithAvatar(
    id: string,
    data: Partial<User>,
    file?: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<User> {
    if (file) {
      const result = await this.cloudinaryService.uploadFile(file, 'avatars');
      data.avatarUrl = result.secure_url;
    }
    await this.userRepository.update(id, data);
    return this.findById(id);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(id, { password: hashed });
  }

  async getDashboard(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const [
      activeBookings,
      savedProperties,
      unreadMessages,
      newNotifications,
      upcomingStay,
      recentlySaved,
      recentMessages,
    ] = await Promise.all([
      this.bookingRepository.count({
        where: {
          userId,
          status: In([
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
          ]),
        },
      }),

      this.favoriteRepository.count({ where: { userId } }),

      this.messageRepository.count({
        where: { receiverId: userId, isRead: false },
      }),

      this.notificationRepository.count({ where: { userId, isRead: false } }),

      this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.property', 'property')
        .where('booking.userId = :userId', { userId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE],
        })
        .andWhere('booking.checkIn >= :today', { today })
        .orderBy('booking.checkIn', 'ASC')
        .getOne(),

      this.favoriteRepository
        .createQueryBuilder('fav')
        .leftJoinAndSelect('fav.property', 'property')
        .where('fav.userId = :userId', { userId })
        .orderBy('fav.createdAt', 'DESC')
        .limit(3)
        .getMany(),

      this.messageRepository
        .createQueryBuilder('msg')
        .leftJoinAndSelect('msg.sender', 'sender')
        .where('msg.receiverId = :userId', { userId })
        .orderBy('msg.createdAt', 'DESC')
        .limit(3)
        .getMany(),
    ]);

    return {
      stats: {
        activeBookings,
        savedProperties,
        unreadMessages,
        newNotifications,
      },
      upcomingStay: upcomingStay ?? null,
      recentMessages,
      recentlySaved,
    };
  }
}
