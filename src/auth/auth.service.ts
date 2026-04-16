import {
  BadRequestException,
  ConflictException,
  Injectable,
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

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

    await this.mailerService.sendOtp(user.email, user.firstName, otp);

    return { message: 'Registration successful. Check your email for the OTP.' };
  }

  async registerHost(dto: HostRegisterDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();

    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
      role: UserRole.HOST,
      otp,
      otpExpiresAt: this.getOtpExpiry(),
    });

    await this.mailerService.sendOtp(user.email, user.firstName, otp);

    return { message: 'Host registration successful. Check your email for the OTP.' };
  }

  async verifyEmail(dto: VerifyOtpDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid email');

    if (user.otp !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired');

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

    if (user.role !== expectedRole) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified)
      throw new UnauthorizedException('Please verify your email before logging in');

    const token = this.generateToken(user);
    return { accessToken: token };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) return { message: 'If this email exists, a reset OTP has been sent.' };

    const otp = this.generateOtp();
    await this.userService.update(user.id, {
      otp,
      otpExpiresAt: this.getOtpExpiry(),
    });

    await this.mailerService.sendPasswordResetOtp(user.email, user.firstName, otp);

    return { message: 'If this email exists, a reset OTP has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid email');

    if (user.otp !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userService.update(user.id, {
      password: hashedPassword,
      otp: null,
      otpExpiresAt: null,
    });

    return { message: 'Password reset successfully' };
  }
}
