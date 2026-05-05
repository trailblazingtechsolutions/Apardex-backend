import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole, AdminRole } from '../user/user.entity';
import { KycStatus } from '../user/user.entity';
import { PropertyFiltersDto } from './dto/property-filters.dto';
import { BookingFiltersDto } from './dto/booking-filters.dto';
import { UserFiltersDto, HostFiltersDto } from './dto/user-filters.dto';
import { KycActionDto } from './dto/kyc-action.dto';
import {
  CreateDisputeDto,
  DisputeFiltersDto,
  IssueRefundDto,
  ResolveDisputeDto,
} from './dto/dispute.dto';
import { InviteTeamMemberDto, UpdateTeamMemberRoleDto } from './dto/team.dto';
import { UpdateAdminNotificationPreferencesDto } from './dto/admin-notification-preferences.dto';
import { PayoutFiltersDto, CreatePayoutDto } from './dto/payout-filters.dto';
import { GenerateReportDto } from './dto/report.dto';
import { HostPayoutStatus } from '../host/entities/host-payout.entity';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  @Post('bootstrap')
  @ApiOperation({ summary: 'Create first admin account (requires master key header)' })
  async bootstrap(
    @Headers('x-admin-master-key') masterKey: string,
    @Body() body: { email: string; password: string; firstName: string; lastName: string },
  ) {
    const expected = this.configService.get<string>('ADMIN_MASTER_KEY');
    if (!expected || masterKey !== expected) {
      throw new UnauthorizedException('Invalid master key');
    }
    return this.adminService.createAdmin(
      body.email,
      body.password,
      body.firstName,
      body.lastName,
      AdminRole.SUPER_ADMIN,
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform dashboard overview' })
  getDashboard() {
    return this.adminService.getDashboardOverview();
  }

  // ─── Properties ──────────────────────────────────────────────────────────────

  @Get('properties')
  @ApiOperation({ summary: 'List all properties with filters' })
  getProperties(@Query() filters: PropertyFiltersDto) {
    return this.adminService.getProperties(filters);
  }

  @Get('properties/:id')
  @ApiOperation({ summary: 'Get property details' })
  getProperty(@Param('id') id: string) {
    return this.adminService.getPropertyById(id);
  }

  @Patch('properties/:id/approve')
  @ApiOperation({ summary: 'Approve a property listing' })
  approveProperty(@Param('id') id: string) {
    return this.adminService.approveProperty(id);
  }

  @Patch('properties/:id/suspend')
  @ApiOperation({ summary: 'Suspend a property listing' })
  suspendProperty(@Param('id') id: string) {
    return this.adminService.suspendProperty(id);
  }

  @Patch('properties/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended property' })
  reactivateProperty(@Param('id') id: string) {
    return this.adminService.reactivateProperty(id);
  }

  @Delete('properties/:id')
  @ApiOperation({ summary: 'Permanently delete a property' })
  @ApiResponse({ status: 200, description: 'Property deleted' })
  deleteProperty(@Param('id') id: string) {
    return this.adminService.deleteProperty(id);
  }

  // ─── Bookings ────────────────────────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({ summary: 'List all bookings with filters' })
  getBookings(@Query() filters: BookingFiltersDto) {
    return this.adminService.getBookings(filters);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking details' })
  getBooking(@Param('id') id: string) {
    return this.adminService.getBookingById(id);
  }

  // ─── Hosts ───────────────────────────────────────────────────────────────────

  @Get('hosts')
  @ApiOperation({ summary: 'List all hosts' })
  getHosts(@Query() filters: HostFiltersDto) {
    return this.adminService.getHosts(filters);
  }

  @Get('hosts/:id')
  @ApiOperation({ summary: 'Get host profile + stats' })
  getHost(@Param('id') id: string) {
    return this.adminService.getHostById(id);
  }

  @Patch('hosts/:id/suspend')
  @ApiOperation({ summary: 'Suspend a host account' })
  suspendHost(@Param('id') id: string) {
    return this.adminService.suspendHost(id);
  }

  @Patch('hosts/:id/unsuspend')
  @ApiOperation({ summary: 'Reactivate a suspended host account' })
  unsuspendHost(@Param('id') id: string) {
    return this.adminService.unsuspendHost(id);
  }

  // ─── Guests ──────────────────────────────────────────────────────────────────

  @Get('guests')
  @ApiOperation({ summary: 'List all guests' })
  getGuests(@Query() filters: UserFiltersDto) {
    return this.adminService.getGuests(filters);
  }

  @Get('guests/:id')
  @ApiOperation({ summary: 'Get guest profile + booking history' })
  getGuest(@Param('id') id: string) {
    return this.adminService.getGuestById(id);
  }

  @Patch('guests/:id/suspend')
  @ApiOperation({ summary: 'Suspend a guest account' })
  suspendGuest(@Param('id') id: string) {
    return this.adminService.suspendGuest(id);
  }

  @Patch('guests/:id/activate')
  @ApiOperation({ summary: 'Activate a guest account' })
  activateGuest(@Param('id') id: string) {
    return this.adminService.activateGuest(id);
  }

  // ─── KYC Verification ────────────────────────────────────────────────────────

  @Get('kyc')
  @ApiOperation({ summary: 'Get KYC verification queue' })
  getKycQueue(
    @Query('status') status?: KycStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getKycQueue(status, page, limit);
  }

  @Get('kyc/:hostId')
  @ApiOperation({ summary: 'Get host KYC details' })
  getKycDetail(@Param('hostId') hostId: string) {
    return this.adminService.getKycDetail(hostId);
  }

  @Patch('kyc/:hostId/approve')
  @ApiOperation({ summary: 'Approve host KYC' })
  approveKyc(@Param('hostId') hostId: string) {
    return this.adminService.approveKyc(hostId);
  }

  @Patch('kyc/:hostId/reject')
  @ApiOperation({ summary: 'Reject host KYC' })
  rejectKyc(@Param('hostId') hostId: string, @Body() dto: KycActionDto) {
    return this.adminService.rejectKyc(hostId, dto);
  }

  @Patch('kyc/:hostId/flag')
  @ApiOperation({ summary: 'Flag host account for manual review' })
  flagKyc(@Param('hostId') hostId: string, @Body() dto: KycActionDto) {
    return this.adminService.flagKyc(hostId, dto);
  }

  @Patch('kyc/:hostId/review')
  @ApiOperation({ summary: 'Set host KYC to under review' })
  setKycUnderReview(@Param('hostId') hostId: string) {
    return this.adminService.setKycUnderReview(hostId);
  }

  // ─── Disputes ────────────────────────────────────────────────────────────────

  @Get('disputes')
  @ApiOperation({ summary: 'List all disputes with filters' })
  getDisputes(@Query() filters: DisputeFiltersDto) {
    return this.adminService.getDisputes(filters);
  }

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get dispute details' })
  getDispute(@Param('id') id: string) {
    return this.adminService.getDisputeById(id);
  }

  @Post('disputes')
  @ApiOperation({ summary: 'Create a new dispute/flag' })
  createDispute(@CurrentUser() user: User, @Body() dto: CreateDisputeDto) {
    return this.adminService.createDispute(user.id, dto);
  }

  @Patch('disputes/:id/review')
  @ApiOperation({ summary: 'Set dispute to in-review' })
  reviewDispute(@Param('id') id: string) {
    return this.adminService.setDisputeUnderReview(id);
  }

  @Patch('disputes/:id/resolve')
  @ApiOperation({ summary: 'Resolve a dispute' })
  resolveDispute(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.adminService.resolveDispute(id, dto);
  }

  @Patch('disputes/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a dispute' })
  dismissDispute(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.adminService.dismissDispute(id, dto);
  }

  @Patch('disputes/:id/lock')
  @ApiOperation({ summary: 'Lock dispute thread' })
  lockDispute(@Param('id') id: string) {
    return this.adminService.lockDisputeThread(id);
  }

  // ─── Payouts ─────────────────────────────────────────────────────────────────

  @Get('payouts')
  @ApiOperation({ summary: 'List all host payouts with stats' })
  getPayouts(@Query() filters: PayoutFiltersDto) {
    return this.adminService.getPayoutsOverview(filters);
  }

  @Post('payouts')
  @ApiOperation({ summary: 'Create a host payout' })
  createPayout(@Body() dto: CreatePayoutDto) {
    return this.adminService.createPayout(dto);
  }

  @Patch('payouts/:id/complete')
  @ApiOperation({ summary: 'Mark payout as complete' })
  completePayout(@Param('id') id: string) {
    return this.adminService.updatePayoutStatus(id, HostPayoutStatus.COMPLETE);
  }

  @Patch('payouts/:id/hold')
  @ApiOperation({ summary: 'Put payout on hold' })
  holdPayout(@Param('id') id: string) {
    return this.adminService.updatePayoutStatus(id, HostPayoutStatus.FAILED);
  }

  @Patch('payouts/:id/process')
  @ApiOperation({ summary: 'Set payout to processing' })
  processPayout(@Param('id') id: string) {
    return this.adminService.updatePayoutStatus(id, HostPayoutStatus.PROCESSING);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  @Get('reports/performance')
  @ApiOperation({ summary: 'Get platform performance stats' })
  getPerformance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getPlatformPerformance(from, to);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List generated reports' })
  getReports(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getGeneratedReports(page, limit);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a new report' })
  generateReport(@CurrentUser() user: User, @Body() dto: GenerateReportDto) {
    return this.adminService.generateReport(user.id, dto);
  }

  @Get('disputes/:id/log')
  @ApiOperation({ summary: 'Get dispute audit log' })
  getDisputeLog(@Param('id') id: string) {
    return this.adminService.getDisputeLog(id);
  }

  @Post('disputes/:id/refund/full')
  @ApiOperation({ summary: 'Issue a full refund and resolve dispute' })
  issueFullRefund(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: IssueRefundDto,
  ) {
    return this.adminService.issueFullRefund(id, user.id, dto);
  }

  @Post('disputes/:id/refund/partial')
  @ApiOperation({ summary: 'Issue a partial refund and resolve dispute' })
  issuePartialRefund(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: IssueRefundDto,
  ) {
    return this.adminService.issuePartialRefund(id, user.id, dto);
  }

  @Get('settings/team')
  @ApiOperation({ summary: 'List all admin team members' })
  getTeamMembers() {
    return this.adminService.getTeamMembers();
  }

  @Post('settings/team/invite')
  @ApiOperation({ summary: 'Invite a new admin team member' })
  inviteTeamMember(@Body() dto: InviteTeamMemberDto) {
    return this.adminService.inviteTeamMember(dto);
  }

  @Patch('settings/team/:id/role')
  @ApiOperation({ summary: 'Update a team member sub-role' })
  updateTeamMemberRole(
    @Param('id') id: string,
    @Body() dto: UpdateTeamMemberRoleDto,
  ) {
    return this.adminService.updateTeamMemberRole(id, dto);
  }

  @Delete('settings/team/:id')
  @ApiOperation({ summary: 'Remove a team member' })
  removeTeamMember(@Param('id') id: string, @CurrentUser() user: User) {
    return this.adminService.removeTeamMember(id, user.id);
  }

  @Get('kyc/:hostId/documents')
  @ApiOperation({ summary: 'View uploaded KYC documents for a host' })
  getHostDocuments(@Param('hostId') hostId: string) {
    return this.adminService.getHostDocuments(hostId);
  }

  @Get('payouts/:id/dispute')
  @ApiOperation({ summary: 'Get dispute linked to a payout' })
  getDisputeByPayout(@Param('id') id: string) {
    return this.adminService.getDisputeByPayout(id);
  }

  // ─── Admin Notification Preferences ──────────────────────────────────────────

  @Get('settings/notifications')
  @ApiOperation({ summary: 'Get admin notification preferences' })
  getAdminNotificationPreferences(@CurrentUser() user: User) {
    return this.adminService.getAdminNotificationPreferences(user.id);
  }

  @Patch('settings/notifications')
  @ApiOperation({ summary: 'Update admin notification preferences' })
  updateAdminNotificationPreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateAdminNotificationPreferencesDto,
  ) {
    return this.adminService.updateAdminNotificationPreferences(user.id, dto);
  }
}
