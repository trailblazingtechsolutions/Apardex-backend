import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
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
import { AuthService } from './auth.service';
import { UserRegisterDto } from './dto/user-register.dto';
import { HostRegisterDto } from './dto/host-register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../user/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SocialAuthService } from './social-auth.service';
import { SocialAuthDto } from './dto/social-auth.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { AllowWhilePasswordChangeRequired } from './decorators/allow-password-change.decorator';
import { User } from '../user/user.entity';
import { HostService } from '../host/host.service';

// ─── User Auth ───────────────────────────────────────────────────────────────

@ApiTags('User Auth')
@Controller('auth/user')
export class UserAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly socialAuthService: SocialAuthService,
  ) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in / Sign up with Google',
    description:
      'Send the **Google ID token** obtained from the client-side Google Sign-In SDK. ' +
      'A new account is created automatically if the email is not yet registered; ' +
      'otherwise the existing account is signed in. Returns access + refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns access token, refresh token, and isNewUser flag',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired Google token' })
  googleAuth(@Body() dto: SocialAuthDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip;
    return this.socialAuthService.googleAuth(dto, {
      ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'OTP sent to email' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  register(@Body() dto: UserRegisterDto) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip;
    return this.authService.login(dto, UserRole.USER, {
      ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto, UserRole.USER);
  }

  @Post('resend-otp')
  @ApiOperation({
    summary: 'Resend email verification OTP (unverified accounts only)',
  })
  @ApiResponse({ status: 200, description: 'OTP sent to email' })
  @ApiResponse({
    status: 400,
    description: 'No account found / already verified',
  })
  resendOtp(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerificationOtp(dto.email, UserRole.USER);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'Reset OTP sent if email exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto, UserRole.USER);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto, UserRole.USER);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange refresh token for a new access token' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @AllowWhilePasswordChangeRequired()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and invalidate current session' })
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id, user.currentSessionId!);
  }
}

// ─── Host Auth ────────────────────────────────────────────────────────────────

@ApiTags('Host Auth')
@Controller('auth/host')
export class HostAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly hostService: HostService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new host',
    description:
      'Identity documents are no longer collected here — hosts submit them after signup via POST /host/documents, which places them in the admin KYC review queue.',
  })
  @ApiResponse({ status: 201, description: 'OTP sent to email' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  register(@Body() dto: HostRegisterDto) {
    return this.authService.registerHost(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Host login' })
  @ApiResponse({ status: 200, description: 'Returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip;
    return this.authService.login(dto, UserRole.HOST, {
      ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify host email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto, UserRole.HOST);
  }

  @Post('resend-otp')
  @ApiOperation({
    summary: 'Resend email verification OTP (unverified accounts only)',
  })
  @ApiResponse({ status: 200, description: 'OTP sent to email' })
  @ApiResponse({
    status: 400,
    description: 'No account found / already verified',
  })
  resendOtp(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerificationOtp(dto.email, UserRole.HOST);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'Reset OTP sent if email exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto, UserRole.HOST);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto, UserRole.HOST);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange refresh token for a new access token' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @AllowWhilePasswordChangeRequired()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and invalidate current session' })
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id, user.currentSessionId!);
  }

  /**
   * @deprecated Kept so existing clients keep working — POST /host/documents is
   * the canonical route. This used to write `documentUrl` straight onto the user
   * without creating a HostDocument row, which meant the upload never reached
   * the admin KYC queue; it now delegates to the same path as the profile upload.
   */
  @Post('upload-document')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Upload host identity document (deprecated)',
    deprecated: true,
    description: 'Use POST /host/documents instead — this delegates to it.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        document: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    const doc = await this.hostService.uploadDocument(user.id, {}, file);
    return {
      message: 'Document uploaded successfully',
      url: doc.documentUrl,
    };
  }
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

@ApiTags('Admin Auth')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip;
    return this.authService.login(dto, UserRole.ADMIN, {
      ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request admin password reset OTP' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto, UserRole.ADMIN);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset admin password using OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto, UserRole.ADMIN);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange refresh token for a new access token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @AllowWhilePasswordChangeRequired()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and invalidate current session' })
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id, user.currentSessionId!);
  }
}
