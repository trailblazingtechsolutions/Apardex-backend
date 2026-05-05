import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, KycStatus } from '../user/user.entity';
import { Property, PropertyStatus } from '../property/property.entity';
import { Booking, BookingStatus } from '../booking/booking.entity';
import { Payment } from '../payment/payment.entity';
import { HostPayout, HostPayoutStatus } from '../host/entities/host-payout.entity';
import { Dispute, DisputeStatus } from './entities/dispute.entity';
import { AdminReport, ReportStatus } from './entities/admin-report.entity';
import { PropertyFiltersDto } from './dto/property-filters.dto';
import { BookingFiltersDto } from './dto/booking-filters.dto';
import { UserFiltersDto, HostFiltersDto } from './dto/user-filters.dto';
import { KycActionDto } from './dto/kyc-action.dto';
import {
  CreateDisputeDto,
  DisputeFiltersDto,
  ResolveDisputeDto,
} from './dto/dispute.dto';
import { PayoutFiltersDto, CreatePayoutDto } from './dto/payout-filters.dto';
import { GenerateReportDto } from './dto/report.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(HostPayout)
    private readonly payoutRepo: Repository<HostPayout>,
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(AdminReport)
    private readonly reportRepo: Repository<AdminReport>,
  ) {}

  // ─── Seed / Bootstrap ────────────────────────────────────────────────────────

  async createAdmin(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(password, 8);
    return this.userRepo.save(
      this.userRepo.create({
        email,
        password: hashed,
        firstName,
        lastName,
        role: UserRole.ADMIN,
        isEmailVerified: true,
        kycStatus: KycStatus.APPROVED,
      }),
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboardOverview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = now.toISOString().split('T')[0];

    const [
      totalActiveProperties,
      liveBookingsToday,
      pendingHostVerifications,
      revenueResult,
      recentBookings,
    ] = await Promise.all([
      this.propertyRepo.count({ where: { status: PropertyStatus.ACTIVE } }),

      this.bookingRepo.count({
        where: { status: BookingStatus.ACTIVE, checkIn: today as any },
      }),

      this.userRepo.count({
        where: { role: UserRole.HOST, kycStatus: KycStatus.PENDING },
      }),

      this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.createdAt >= :monthStart', { monthStart })
        .getRawOne<{ total: string }>(),

      this.bookingRepo
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.property', 'property')
        .leftJoinAndSelect('b.user', 'guest')
        .orderBy('b.createdAt', 'DESC')
        .limit(10)
        .getMany(),
    ]);

    return {
      stats: {
        totalActiveProperties,
        liveBookingsToday,
        pendingHostVerifications,
        grossRevenueThisMonth: parseFloat(revenueResult?.total ?? '0'),
      },
      recentBookings,
    };
  }

  // ─── Properties ──────────────────────────────────────────────────────────────

  async getProperties(filters: PropertyFiltersDto) {
    const { page = 1, limit = 20, search, status, location } = filters;
    const qb = this.propertyRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.host', 'host')
      .orderBy('p.createdAt', 'DESC');

    if (status) qb.andWhere('p.status = :status', { status });
    if (location)
      qb.andWhere('p.location ILIKE :location', {
        location: `%${location}%`,
      });
    if (search)
      qb.andWhere(
        '(p.title ILIKE :search OR p.location ILIKE :search OR host.firstName ILIKE :search OR host.lastName ILIKE :search)',
        { search: `%${search}%` },
      );

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { total, page, limit, items };
  }

  async getPropertyById(id: string) {
    const property = await this.propertyRepo.findOne({
      where: { id },
      relations: ['host'],
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async approveProperty(id: string) {
    await this.assertProperty(id);
    await this.propertyRepo.update(id, { status: PropertyStatus.ACTIVE });
    return { message: 'Property approved' };
  }

  async suspendProperty(id: string) {
    await this.assertProperty(id);
    await this.propertyRepo.update(id, { status: PropertyStatus.SUSPENDED });
    return { message: 'Property suspended' };
  }

  async reactivateProperty(id: string) {
    await this.assertProperty(id);
    await this.propertyRepo.update(id, { status: PropertyStatus.ACTIVE });
    return { message: 'Property reactivated' };
  }

  async deleteProperty(id: string) {
    const property = await this.assertProperty(id);
    await this.propertyRepo.remove(property);
    return { message: 'Property deleted' };
  }

  private async assertProperty(id: string): Promise<Property> {
    const p = await this.propertyRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  // ─── Bookings ────────────────────────────────────────────────────────────────

  async getBookings(filters: BookingFiltersDto) {
    const { page = 1, limit = 20, search, status } = filters;
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'property')
      .leftJoinAndSelect('b.user', 'guest')
      .orderBy('b.createdAt', 'DESC');

    if (status) qb.andWhere('b.status = :status', { status });
    if (search)
      qb.andWhere(
        '(b.id ILIKE :search OR property.title ILIKE :search OR guest.firstName ILIKE :search OR guest.lastName ILIKE :search)',
        { search: `%${search}%` },
      );

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { total, page, limit, items };
  }

  async getBookingById(id: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['property', 'user'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // ─── Hosts ───────────────────────────────────────────────────────────────────

  async getHosts(filters: HostFiltersDto) {
    const { page = 1, limit = 20, search, kycStatus, isActive } = filters;
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.HOST })
      .orderBy('u.createdAt', 'DESC');

    if (kycStatus) qb.andWhere('u.kycStatus = :kycStatus', { kycStatus });
    if (isActive !== undefined)
      qb.andWhere('u.isActive = :isActive', { isActive });
    if (search)
      qb.andWhere(
        '(u.firstName ILIKE :search OR u.lastName ILIKE :search OR u.email ILIKE :search)',
        { search: `%${search}%` },
      );

    const [totalHosts, activeVerified, pendingKyc, suspended] =
      await Promise.all([
        this.userRepo.count({ where: { role: UserRole.HOST } }),
        this.userRepo.count({
          where: { role: UserRole.HOST, kycStatus: KycStatus.APPROVED, isActive: true },
        }),
        this.userRepo.count({
          where: { role: UserRole.HOST, kycStatus: KycStatus.PENDING },
        }),
        this.userRepo.count({
          where: { role: UserRole.HOST, isActive: false },
        }),
      ]);

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      stats: { totalHosts, activeVerified, pendingKyc, suspended },
      total,
      page,
      limit,
      items,
    };
  }

  async getHostById(id: string) {
    const host = await this.userRepo.findOne({
      where: { id, role: UserRole.HOST },
    });
    if (!host) throw new NotFoundException('Host not found');

    const [properties, totalBookings, totalEarnings] = await Promise.all([
      this.propertyRepo.count({ where: { hostId: id } }),
      this.bookingRepo
        .createQueryBuilder('b')
        .leftJoin('b.property', 'p')
        .where('p.hostId = :id', { id })
        .getCount(),
      this.paymentRepo
        .createQueryBuilder('p')
        .leftJoin(Booking, 'b', 'b.id = p.bookingId')
        .leftJoin(Property, 'prop', 'prop.id = b.propertyId')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('prop.hostId = :id', { id })
        .getRawOne<{ total: string }>(),
    ]);

    return {
      ...host,
      stats: {
        properties,
        totalBookings,
        totalEarnings: parseFloat(totalEarnings?.total ?? '0'),
      },
    };
  }

  async suspendHost(id: string) {
    await this.userRepo.update({ id, role: UserRole.HOST }, { isActive: false });
    return { message: 'Host account suspended' };
  }

  async unsuspendHost(id: string) {
    await this.userRepo.update({ id, role: UserRole.HOST }, { isActive: true });
    return { message: 'Host account reactivated' };
  }

  // ─── Guests ──────────────────────────────────────────────────────────────────

  async getGuests(filters: UserFiltersDto) {
    const { page = 1, limit = 20, search, isActive } = filters;
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.USER })
      .orderBy('u.createdAt', 'DESC');

    if (isActive !== undefined)
      qb.andWhere('u.isActive = :isActive', { isActive });
    if (search)
      qb.andWhere(
        '(u.firstName ILIKE :search OR u.lastName ILIKE :search OR u.email ILIKE :search)',
        { search: `%${search}%` },
      );

    const [totalGuests, activeGuests, flaggedGuests] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.USER } }),
      this.userRepo.count({ where: { role: UserRole.USER, isActive: true } }),
      this.userRepo.count({ where: { role: UserRole.USER, isActive: false } }),
    ]);

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      stats: { totalGuests, activeGuests, flaggedGuests },
      total,
      page,
      limit,
      items,
    };
  }

  async getGuestById(id: string) {
    const guest = await this.userRepo.findOne({
      where: { id, role: UserRole.USER },
    });
    if (!guest) throw new NotFoundException('Guest not found');

    const bookings = await this.bookingRepo.find({
      where: { userId: id },
      relations: ['property'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return { ...guest, recentBookings: bookings };
  }

  async suspendGuest(id: string) {
    await this.userRepo.update({ id, role: UserRole.USER }, { isActive: false });
    return { message: 'Guest account suspended' };
  }

  async activateGuest(id: string) {
    await this.userRepo.update({ id, role: UserRole.USER }, { isActive: true });
    return { message: 'Guest account activated' };
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────────

  async getKycQueue(status?: KycStatus, page = 1, limit = 20) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.HOST })
      .andWhere('u.documentUrl IS NOT NULL')
      .orderBy('u.createdAt', 'ASC');

    if (status) {
      qb.andWhere('u.kycStatus = :status', { status });
    } else {
      qb.andWhere('u.kycStatus IN (:...statuses)', {
        statuses: [KycStatus.PENDING, KycStatus.UNDER_REVIEW],
      });
    }

    const [pending, underReview, approved, rejected] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.HOST, kycStatus: KycStatus.PENDING } }),
      this.userRepo.count({ where: { role: UserRole.HOST, kycStatus: KycStatus.UNDER_REVIEW } }),
      this.userRepo.count({ where: { role: UserRole.HOST, kycStatus: KycStatus.APPROVED } }),
      this.userRepo.count({ where: { role: UserRole.HOST, kycStatus: KycStatus.REJECTED } }),
    ]);

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      stats: { pending, underReview, approved, rejected },
      total,
      page,
      limit,
      items,
    };
  }

  async getKycDetail(hostId: string) {
    const host = await this.userRepo.findOne({
      where: { id: hostId, role: UserRole.HOST },
    });
    if (!host) throw new NotFoundException('Host not found');
    return host;
  }

  async approveKyc(hostId: string) {
    await this.assertHost(hostId);
    await this.userRepo.update(hostId, {
      kycStatus: KycStatus.APPROVED,
      isDocumentVerified: true,
    });
    return { message: 'Host KYC approved' };
  }

  async rejectKyc(hostId: string, dto: KycActionDto) {
    await this.assertHost(hostId);
    await this.userRepo.update(hostId, { kycStatus: KycStatus.REJECTED });
    return { message: 'Host KYC rejected', reason: dto.reason };
  }

  async flagKyc(hostId: string, dto: KycActionDto) {
    await this.assertHost(hostId);
    await this.userRepo.update(hostId, { kycStatus: KycStatus.FLAGGED });
    return { message: 'Host KYC flagged for review', reason: dto.reason };
  }

  async setKycUnderReview(hostId: string) {
    await this.assertHost(hostId);
    await this.userRepo.update(hostId, { kycStatus: KycStatus.UNDER_REVIEW });
    return { message: 'Host KYC set to under review' };
  }

  private async assertHost(id: string): Promise<User> {
    const u = await this.userRepo.findOne({ where: { id, role: UserRole.HOST } });
    if (!u) throw new NotFoundException('Host not found');
    return u;
  }

  // ─── Disputes ────────────────────────────────────────────────────────────────

  private generateTicketId(): string {
    return `DIS-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  async getDisputes(filters: DisputeFiltersDto) {
    const { page = 1, limit = 20, search, status, type, priority } = filters;
    const qb = this.disputeRepo
      .createQueryBuilder('d')
      .orderBy('d.createdAt', 'DESC');

    if (status) qb.andWhere('d.status = :status', { status });
    if (type) qb.andWhere('d.type = :type', { type });
    if (priority) qb.andWhere('d.priority = :priority', { priority });
    if (search)
      qb.andWhere(
        '(d.ticketId ILIKE :search OR d.description ILIKE :search)',
        { search: `%${search}%` },
      );

    const [total, open, inReview, resolved] = await Promise.all([
      this.disputeRepo.count(),
      this.disputeRepo.count({ where: { status: DisputeStatus.OPEN } }),
      this.disputeRepo.count({ where: { status: DisputeStatus.IN_REVIEW } }),
      this.disputeRepo.count({ where: { status: DisputeStatus.RESOLVED } }),
    ]);

    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      stats: { total, open, inReview, resolved },
      page,
      limit,
      items,
    };
  }

  async getDisputeById(id: string) {
    const dispute = await this.disputeRepo.findOne({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async createDispute(reportedById: string, dto: CreateDisputeDto) {
    const dispute = this.disputeRepo.create({
      ...dto,
      reportedById,
      ticketId: this.generateTicketId(),
    });
    return this.disputeRepo.save(dispute);
  }

  async setDisputeUnderReview(id: string) {
    await this.assertDispute(id);
    await this.disputeRepo.update(id, { status: DisputeStatus.IN_REVIEW });
    return { message: 'Dispute set to in review' };
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto) {
    await this.assertDispute(id);
    await this.disputeRepo.update(id, {
      status: DisputeStatus.RESOLVED,
      resolution: dto.resolution ?? null,
      resolvedAt: new Date(),
    });
    return { message: 'Dispute resolved' };
  }

  async dismissDispute(id: string, dto: ResolveDisputeDto) {
    await this.assertDispute(id);
    await this.disputeRepo.update(id, {
      status: DisputeStatus.DISMISSED,
      resolution: dto.resolution ?? null,
      resolvedAt: new Date(),
    });
    return { message: 'Dispute dismissed' };
  }

  async lockDisputeThread(id: string) {
    await this.assertDispute(id);
    await this.disputeRepo.update(id, { isLocked: true });
    return { message: 'Dispute thread locked' };
  }

  private async assertDispute(id: string): Promise<Dispute> {
    const d = await this.disputeRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Dispute not found');
    return d;
  }

  // ─── Payouts ─────────────────────────────────────────────────────────────────

  async getPayoutsOverview(filters: PayoutFiltersDto) {
    const { page = 1, limit = 20, status } = filters;

    const [totalProcessed, processing, pendingClearance, onHold] =
      await Promise.all([
        this.payoutRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.amount), 0)', 'total')
          .where('p.status = :status', { status: HostPayoutStatus.COMPLETE })
          .getRawOne<{ total: string }>(),
        this.payoutRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.amount), 0)', 'total')
          .where('p.status = :status', { status: HostPayoutStatus.PROCESSING })
          .getRawOne<{ total: string }>(),
        this.payoutRepo.count({ where: { status: HostPayoutStatus.PROCESSING } }),
        this.payoutRepo.count({ where: { status: HostPayoutStatus.FAILED } }),
      ]);

    const qb = this.payoutRepo
      .createQueryBuilder('p')
      .orderBy('p.createdAt', 'DESC');
    if (status) qb.andWhere('p.status = :status', { status });

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      stats: {
        totalProcessed: parseFloat(totalProcessed?.total ?? '0'),
        processing: parseFloat(processing?.total ?? '0'),
        pendingClearance,
        onHold,
      },
      total,
      page,
      limit,
      items,
    };
  }

  async createPayout(dto: CreatePayoutDto) {
    const payout = this.payoutRepo.create({
      hostId: dto.hostId,
      amount: dto.amount,
      currency: dto.currency,
      payoutMethodId: dto.payoutMethodId ?? null,
      status: HostPayoutStatus.PROCESSING,
      periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
      periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
    });
    return this.payoutRepo.save(payout);
  }

  async updatePayoutStatus(id: string, status: HostPayoutStatus) {
    await this.payoutRepo.update(id, { status });
    return { message: `Payout marked as ${status}` };
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async getPlatformPerformance(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const [grossBookingValue, platformRevenue, totalBookings, refundRate] =
      await Promise.all([
        this.paymentRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.amount), 0)', 'total')
          .where('p.createdAt BETWEEN :from AND :to', { from: fromDate, to: toDate })
          .getRawOne<{ total: string }>(),
        this.paymentRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.amount * 0.1), 0)', 'total')
          .where('p.createdAt BETWEEN :from AND :to', { from: fromDate, to: toDate })
          .getRawOne<{ total: string }>(),
        this.bookingRepo.count(),
        0,
      ]);

    return {
      dateRange: { from: fromDate, to: toDate },
      stats: {
        grossBookingValue: parseFloat(grossBookingValue?.total ?? '0'),
        platformRevenue: parseFloat(platformRevenue?.total ?? '0'),
        totalBookings,
        refundRate,
      },
    };
  }

  async getGeneratedReports(page = 1, limit = 20) {
    const [items, total] = await this.reportRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { total, page, limit, items };
  }

  async generateReport(adminId: string, dto: GenerateReportDto) {
    const report = await this.reportRepo.save(
      this.reportRepo.create({
        name: dto.name,
        outputType: dto.outputType,
        status: ReportStatus.GENERATING,
        dateRangeStart: dto.dateRangeStart ? new Date(dto.dateRangeStart) : null,
        dateRangeEnd: dto.dateRangeEnd ? new Date(dto.dateRangeEnd) : null,
        generatedById: adminId,
      }),
    );
    return report;
  }
}
