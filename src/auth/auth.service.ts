import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { UserService } from '../user/user.service';
import { AuthProvider, User, UserRole } from '../user/user.entity';
import { UserRegisterDto } from './dto/user-register.dto';
import { HostRegisterDto } from './dto/host-register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailerService } from '../mailer/mailer.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private generateHostCode(): string {
    return `HST-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  private getOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    return expiry;
  }

  private generateToken(user: User, sessionId?: string): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole ?? null,
      tokenVersion: user.tokenVersion ?? 0,
      sessionId: sessionId ?? null,
    });
  }

  private buildRefreshToken(sessionId: string): {
    raw: string;
    hash: string;
    expiresAt: Date;
  } {
    const secret = randomBytes(40).toString('hex');
    const raw = `${sessionId}.${secret}`;
    const hash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    return { raw, hash, expiresAt };
  }

  async registerUser(dto: UserRegisterDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 8);
    const otp = this.generateOtp();

    const user = await this.userService.create({
      ...dto,
      fullName: dto.fullName,
      password: hashedPassword,
      role: UserRole.USER,
      otp,
      otpExpiresAt: this.getOtpExpiry(),
    });

    this.logger.log(`Sending OTP email to ${user.email}...`);
    try {
      await this.mailerService.sendOtp(user.email, user.fullName ?? user.firstName, otp);
      this.logger.log(`OTP email sent successfully to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${user.email}`, err);
    }

    return {
      message: 'Registration successful. Check your email for the OTP.',
    };
  }

  async registerHost(
    dto: HostRegisterDto,
    documentFile: Express.Multer.File,
  ) {
    if (!documentFile)
      throw new BadRequestException(
        'Identity document is required for host registration',
      );

    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const uploadResult = await this.cloudinaryService.uploadFile(
      documentFile,
      'host-documents',
    );

    const hashedPassword = await bcrypt.hash(dto.password, 8);
    const otp = this.generateOtp();

    const user = await this.userService.create({
      ...dto,
      fullName: dto.fullName,
      password: hashedPassword,
      role: UserRole.HOST,
      otp,
      otpExpiresAt: this.getOtpExpiry(),
      documentUrl: uploadResult.secure_url,
      hostCode: this.generateHostCode(),
    });

    this.logger.log(`Sending OTP email to ${user.email}...`);
    try {
      await this.mailerService.sendOtp(user.email, user.fullName ?? user.firstName, otp);
      this.logger.log(`OTP email sent successfully to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${user.email}`, err);
    }

    return {
      message: 'Host registration successful. Check your email for the OTP.',
    };
  }

  async verifyEmail(dto: VerifyOtpDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid email');

    if (user.otp !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt)
      throw new BadRequestException('OTP has expired');

    await this.userService.update(user.id, {
      isEmailVerified: true,
      otp: null,
      otpExpiresAt: null,
    });

    return { message: 'Email verified successfully' };
  }

  async login(
    dto: LoginDto,
    expectedRole: UserRole,
    meta: { ip?: string; userAgent?: string } = {},
  ) {
    const user = await this.userService.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.role !== expectedRole)
      throw new UnauthorizedException('Invalid credentials');

    if (!user.password)
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please continue with Google.',
      );

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified)
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );

    return this.issueTokens(user, meta);
  }

  private async issueTokens(
    user: User,
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.userService.createSession(user.id, meta);
    const { raw, hash, expiresAt } = this.buildRefreshToken(session.id);
    await this.userService.updateSessionRefreshToken(session.id, hash, expiresAt);
    const accessToken = this.generateToken(user, session.id);
    return { accessToken, refreshToken: raw };
  }

  /**
   * Find-or-create for Google OAuth. Handles both sign up (new account) and
   * sign in (existing account), then issues our own JWT + refresh token.
   */
  async validateGoogleUser(
    profile: {
      googleId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    },
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string; isNewUser: boolean }> {
    if (!profile.email)
      throw new UnauthorizedException('Google account has no email address');

    let isNewUser = false;

    // 1. Already linked by Google ID.
    let user = await this.userService.findByGoogleId(profile.googleId);

    // 2. Match by email — link the Google identity onto the existing account.
    if (!user) {
      user = await this.userService.findByEmail(profile.email);
      if (user) {
        user = await this.userService.update(user.id, {
          googleId: profile.googleId,
          authProvider: AuthProvider.GOOGLE,
          isEmailVerified: true,
          avatarUrl: user.avatarUrl ?? profile.avatarUrl ?? null,
        });
      }
    }

    // 3. New account — sign up via Google. Email is trusted/verified by Google.
    if (!user) {
      isNewUser = true;
      const fullName = [profile.firstName, profile.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      user = await this.userService.create({
        email: profile.email,
        fullName: fullName || profile.email.split('@')[0],
        password: null,
        googleId: profile.googleId,
        authProvider: AuthProvider.GOOGLE,
        role: UserRole.USER,
        isEmailVerified: true,
        avatarUrl: profile.avatarUrl ?? null,
      });
    }

    if (!user.isActive)
      throw new UnauthorizedException('This account has been deactivated');

    const tokens = await this.issueTokens(user, meta);
    return { ...tokens, isNewUser };
  }

  async resendVerificationOtp(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new BadRequestException('No account found with this email');

    if (user.isEmailVerified)
      throw new BadRequestException('This email is already verified');

    const otp = this.generateOtp();
    await this.userService.update(user.id, {
      otp,
      otpExpiresAt: this.getOtpExpiry(),
    });

    this.logger.log(`Resending OTP email to ${user.email}...`);
    try {
      await this.mailerService.sendOtp(user.email, user.fullName ?? user.firstName, otp);
      this.logger.log(`OTP email resent successfully to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to resend OTP email to ${user.email}`, err);
    }

    return { message: 'A new OTP has been sent to your email.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user)
      return { message: 'If this email exists, a reset OTP has been sent.' };

    const otp = this.generateOtp();
    await this.userService.update(user.id, {
      otp,
      otpExpiresAt: this.getOtpExpiry(),
    });

    this.logger.log(`Sending password reset OTP email to ${user.email}...`);
    try {
      await this.mailerService.sendPasswordResetOtp(user.email, user.fullName ?? user.firstName, otp);
      this.logger.log(`Password reset OTP email sent successfully to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send reset OTP email to ${user.email}`, err);
    }

    return { message: 'If this email exists, a reset OTP has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid email');

    if (user.otp !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt)
      throw new BadRequestException('OTP has expired');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 8);
    await this.userService.update(user.id, {
      password: hashedPassword,
      otp: null,
      otpExpiresAt: null,
    });

    return { message: 'Password reset successfully' };
  }

  async refresh(rawRefreshToken: string): Promise<{ accessToken: string }> {
    const dotIndex = rawRefreshToken.indexOf('.');
    if (dotIndex === -1) throw new UnauthorizedException('Invalid refresh token');

    const sessionId = rawRefreshToken.substring(0, dotIndex);
    const hash = createHash('sha256').update(rawRefreshToken).digest('hex');

    const session = await this.userService.findActiveSession(sessionId);
    if (!session || session.refreshTokenHash !== hash) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (session.expiresAt && new Date() > session.expiresAt) {
      await this.userService.revokeSession(session.userId, sessionId);
      throw new UnauthorizedException('Refresh token expired, please log in again');
    }

    const user = await this.userService.findById(session.userId);
    void this.userService.touchSession(sessionId);
    return { accessToken: this.generateToken(user, sessionId) };
  }

  async logout(userId: string, sessionId: string): Promise<{ message: string }> {
    return this.userService.revokeSession(userId, sessionId);
  }
}
