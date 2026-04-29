import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { User, UserRole } from '../user/user.entity';
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

  private getOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    return expiry;
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async registerUser(dto: UserRegisterDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();

    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
      role: UserRole.USER,
      otp,
      otpExpiresAt: this.getOtpExpiry(),
    });

    this.logger.log(`Sending OTP email to ${user.email}...`);
    try {
      await this.mailerService.sendOtp(user.email, user.fullName, otp);
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

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();

    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
      role: UserRole.HOST,
      otp,
      otpExpiresAt: this.getOtpExpiry(),
      documentUrl: uploadResult.secure_url,
    });

    this.logger.log(`Sending OTP email to ${user.email}...`);
    try {
      await this.mailerService.sendOtp(user.email, user.fullName, otp);
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

  async login(dto: LoginDto, expectedRole: UserRole) {
    const user = await this.userService.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.role !== expectedRole)
      throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified)
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );

    const token = this.generateToken(user);
    return { accessToken: token };
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
      await this.mailerService.sendOtp(user.email, user.fullName, otp);
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
      await this.mailerService.sendPasswordResetOtp(user.email, user.fullName, otp);
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

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userService.update(user.id, {
      password: hashedPassword,
      otp: null,
      otpExpiresAt: null,
    });

    return { message: 'Password reset successfully' };
  }
}
