import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './user.entity';
import { ChangePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/preferences.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { BillingAddressDto } from './dto/billing-address.dto';
import { SecuritySettingsDto } from './dto/security-settings.dto';

@ApiTags('User')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ─── Profile ────────────────────────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Patch('profile')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update profile fields + optional avatar' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'John Doe' },
        phoneNumber: { type: 'string', example: '+2348012345678' },
        location: { type: 'string', example: 'Lagos, Nigeria' },
        bio: { type: 'string', example: 'I love travelling.' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.updateWithAvatar(user.id, dto, file);
  }

  @Delete('profile/avatar')
  @ApiOperation({ summary: 'Remove profile avatar' })
  @ApiResponse({ status: 200, description: 'Avatar removed' })
  removeAvatar(@CurrentUser() user: User) {
    return this.userService.removeAvatar(user.id);
  }

  // ─── Password ───────────────────────────────────────────────────────────────

  @Patch('change-password')
  @ApiOperation({
    summary: 'Change account password (user, host and admin accounts)',
    description:
      'All existing sessions are invalidated on success — the client must log in again.',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(user.id, dto);
  }

  // ─── Preferences ────────────────────────────────────────────────────────────

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  getPreferences(@CurrentUser() user: User) {
    return this.userService.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.userService.updatePreferences(user.id, dto);
  }

  // ─── Notification Preferences ───────────────────────────────────────────────

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  getNotificationPreferences(@CurrentUser() user: User) {
    return this.userService.getNotificationPreferences(user.id);
  }

  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotificationPreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.userService.updateNotificationPreferences(user.id, dto);
  }

  // ─── Security Settings ──────────────────────────────────────────────────────

  @Patch('security-settings')
  @ApiOperation({ summary: 'Update security settings (2FA, login alerts)' })
  updateSecuritySettings(
    @CurrentUser() user: User,
    @Body() dto: SecuritySettingsDto,
  ) {
    return this.userService.updateSecuritySettings(user.id, dto);
  }

  // ─── Billing Address ────────────────────────────────────────────────────────

  @Get('billing-address')
  @ApiOperation({ summary: 'Get billing address' })
  getBillingAddress(@CurrentUser() user: User) {
    return this.userService.getBillingAddress(user.id);
  }

  @Patch('billing-address')
  @ApiOperation({ summary: 'Save billing address' })
  updateBillingAddress(
    @CurrentUser() user: User,
    @Body() dto: BillingAddressDto,
  ) {
    return this.userService.updateBillingAddress(user.id, dto);
  }

  // ─── Account Lifecycle ──────────────────────────────────────────────────────

  @Patch('deactivate')
  @ApiOperation({ summary: 'Deactivate account (reversible)' })
  @ApiResponse({ status: 200, description: 'Account deactivated' })
  deactivateAccount(@CurrentUser() user: User) {
    return this.userService.deactivateAccount(user.id);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Permanently delete account and all data' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  deleteAccount(@CurrentUser() user: User) {
    return this.userService.deleteAccount(user.id);
  }

  // ─── Sessions ───────────────────────────────────────────────────────────────

  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions (devices)' })
  getSessions(@CurrentUser() user: User) {
    return this.userService.getSessions(user.id);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Revoke a specific session (log out that device)' })
  revokeSession(@CurrentUser() user: User, @Param('id') id: string) {
    return this.userService.revokeSession(user.id, id);
  }

  @Post('sessions/revoke-others')
  @ApiOperation({ summary: 'Log out all other devices except the current one' })
  revokeAllOtherSessions(@CurrentUser() user: User) {
    const currentSessionId = user.currentSessionId ?? '';
    return this.userService.revokeAllOtherSessions(user.id, currentSessionId);
  }

  // ─── Dashboards ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get customer dashboard overview' })
  getDashboard(@CurrentUser() user: User) {
    return this.userService.getDashboard(user.id);
  }

  @Get('host-dashboard')
  @ApiOperation({ summary: 'Get host dashboard overview' })
  getHostDashboard(@CurrentUser() user: User) {
    return this.userService.getHostDashboard(user.id);
  }
}
