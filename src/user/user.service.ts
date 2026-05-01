import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { ChangePasswordDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/preferences.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { BillingAddressDto } from './dto/billing-address.dto';
import { SecuritySettingsDto } from './dto/security-settings.dto';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserNotificationPreferences } from './entities/user-notification-preferences.entity';
import { UserSession } from './entities/user-session.entity';
import { Booking, BookingStatus } from '../booking/booking.entity';
import { Favorite } from '../favorites/favorite.entity';
import { Message } from '../messaging/message.entity';
import { Notification } from '../notifications/notification.entity';
import { Property, PropertyStatus } from '../property/property.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

function parseUserAgent(ua: string): {
  deviceName: string;
  deviceType: string;
  browser: string;
} {
  const deviceType = /mobile|android|iphone|ipad/i.test(ua)
    ? 'mobile'
    : 'desktop';

  let deviceName = 'Unknown Device';
  if (/iphone/i.test(ua)) deviceName = 'iPhone';
  else if (/ipad/i.test(ua)) deviceName = 'iPad';
  else if (/android/i.test(ua)) deviceName = 'Android Device';
  else if (/macintosh|mac os x/i.test(ua)) deviceName = 'Mac';
  else if (/windows nt/i.test(ua)) deviceName = 'Windows PC';
  else if (/linux/i.test(ua)) deviceName = 'Linux PC';

  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/opera|opr\//i.test(ua)) browser = 'Opera';

  return { deviceName, deviceType, browser };
}

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
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepository: Repository<UserPreferences>,
    @InjectRepository(UserNotificationPreferences)
    private readonly notifPrefsRepository: Repository<UserNotificationPreferences>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
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

    const hashed = await bcrypt.hash(dto.newPassword, 8);
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

  async getHostDashboard(hostId: string) {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const [
      totalListings,
      activeListings,
      totalBookings,
      pendingBookings,
      thisMonthRevenue,
      totalRevenue,
      avgRatingResult,
      upcomingCheckIns,
      recentBookings,
      pendingApprovals,
    ] = await Promise.all([
      this.propertyRepository.count({ where: { hostId } }),

      this.propertyRepository.count({
        where: { hostId, status: PropertyStatus.ACTIVE },
      }),

      this.bookingRepository
        .createQueryBuilder('b')
        .leftJoin('b.property', 'p')
        .where('p.hostId = :hostId', { hostId })
        .getCount(),

      this.bookingRepository
        .createQueryBuilder('b')
        .leftJoin('b.property', 'p')
        .where('p.hostId = :hostId', { hostId })
        .andWhere('b.status = :status', { status: BookingStatus.PENDING })
        .getCount(),

      this.bookingRepository
        .createQueryBuilder('b')
        .leftJoin('b.property', 'p')
        .select('COALESCE(SUM(b.totalPrice), 0)', 'total')
        .where('p.hostId = :hostId', { hostId })
        .andWhere('b.isPaid = true')
        .andWhere('b.createdAt >= :monthStart', { monthStart })
        .getRawOne<{ total: string }>(),

      this.bookingRepository
        .createQueryBuilder('b')
        .leftJoin('b.property', 'p')
        .select('COALESCE(SUM(b.totalPrice), 0)', 'total')
        .where('p.hostId = :hostId', { hostId })
        .andWhere('b.isPaid = true')
        .getRawOne<{ total: string }>(),

      this.propertyRepository
        .createQueryBuilder('p')
        .select('COALESCE(AVG(p.avgRating), 0)', 'avg')
        .where('p.hostId = :hostId', { hostId })
        .getRawOne<{ avg: string }>(),

      this.bookingRepository
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.property', 'p')
        .leftJoinAndSelect('b.user', 'user')
        .where('p.hostId = :hostId', { hostId })
        .andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE],
        })
        .andWhere('b.checkIn >= :today', { today })
        .andWhere('b.checkIn <= :nextWeek', { nextWeek })
        .orderBy('b.checkIn', 'ASC')
        .getMany(),

      this.bookingRepository
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.property', 'p')
        .leftJoinAndSelect('b.user', 'user')
        .where('p.hostId = :hostId', { hostId })
        .orderBy('b.createdAt', 'DESC')
        .limit(5)
        .getMany(),

      this.bookingRepository
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.property', 'p')
        .leftJoinAndSelect('b.user', 'user')
        .where('p.hostId = :hostId', { hostId })
        .andWhere('b.status = :status', { status: BookingStatus.PENDING })
        .orderBy('b.createdAt', 'ASC')
        .getMany(),
    ]);

    return {
      stats: {
        totalListings,
        activeListings,
        totalBookings,
        pendingBookings,
        thisMonthRevenue: parseFloat(thisMonthRevenue?.total ?? '0'),
        totalRevenue: parseFloat(totalRevenue?.total ?? '0'),
        avgRating: parseFloat(avgRatingResult?.avg ?? '0'),
      },
      upcomingCheckIns,
      recentBookings,
      pendingApprovals,
    };
  }

  // ─── Preferences ────────────────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<UserPreferences> {
    const existing = await this.preferencesRepository.findOne({
      where: { userId },
    });
    if (existing) return existing;
    return this.preferencesRepository.save(
      this.preferencesRepository.create({ userId }),
    );
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    let prefs = await this.preferencesRepository.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.preferencesRepository.create({ userId });
    }
    Object.assign(prefs, dto);
    return this.preferencesRepository.save(prefs);
  }

  // ─── Notification Preferences ───────────────────────────────────────────────

  async getNotificationPreferences(
    userId: string,
  ): Promise<UserNotificationPreferences> {
    const existing = await this.notifPrefsRepository.findOne({
      where: { userId },
    });
    if (existing) return existing;
    return this.notifPrefsRepository.save(
      this.notifPrefsRepository.create({ userId }),
    );
  }

  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreferences> {
    let prefs = await this.notifPrefsRepository.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.notifPrefsRepository.create({ userId });
    }
    Object.assign(prefs, dto);
    return this.notifPrefsRepository.save(prefs);
  }

  // ─── Security Settings ──────────────────────────────────────────────────────

  async updateSecuritySettings(
    userId: string,
    dto: SecuritySettingsDto,
  ): Promise<User> {
    await this.userRepository.update(userId, dto);
    return this.findById(userId);
  }

  // ─── Billing Address ────────────────────────────────────────────────────────

  async getBillingAddress(userId: string) {
    const user = await this.findById(userId);
    return { billingAddress: user.billingAddress };
  }

  async updateBillingAddress(
    userId: string,
    dto: BillingAddressDto,
  ): Promise<{ billingAddress: typeof dto }> {
    await this.userRepository.update(userId, { billingAddress: dto });
    return { billingAddress: dto };
  }

  // ─── Avatar Remove ──────────────────────────────────────────────────────────

  async removeAvatar(userId: string): Promise<User> {
    await this.userRepository.update(userId, { avatarUrl: null });
    return this.findById(userId);
  }

  // ─── Account Lifecycle ──────────────────────────────────────────────────────

  async deactivateAccount(userId: string): Promise<{ message: string }> {
    await this.userRepository.update(userId, { isActive: false });
    return { message: 'Account deactivated successfully' };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId);
    await this.userRepository.remove(user);
    return { message: 'Account deleted successfully' };
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  async createSession(
    userId: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<UserSession> {
    const parsed = meta.userAgent
      ? parseUserAgent(meta.userAgent)
      : {
          deviceName: 'Unknown Device',
          deviceType: 'desktop',
          browser: 'Unknown',
        };

    return this.sessionRepository.save(
      this.sessionRepository.create({
        userId,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        deviceName: parsed.deviceName,
        deviceType: parsed.deviceType,
        browser: parsed.browser,
        lastActiveAt: new Date(),
      }),
    );
  }

  async findActiveSession(sessionId: string): Promise<UserSession | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId, isActive: true },
    });
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      lastActiveAt: new Date(),
    });
  }

  async getSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActiveAt: 'DESC' },
    });
  }

  async revokeSession(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    await this.sessionRepository.update(
      { id: sessionId, userId },
      { isActive: false },
    );
    return { message: 'Session revoked' };
  }

  async revokeAllOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<{ message: string }> {
    await this.sessionRepository.update(
      { userId, id: Not(currentSessionId), isActive: true },
      { isActive: false },
    );
    return { message: 'All other devices have been logged out' };
  }
}
