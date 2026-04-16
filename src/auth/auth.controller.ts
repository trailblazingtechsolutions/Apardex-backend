import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { UserRegisterDto } from './dto/user-register.dto';
import { HostRegisterDto } from './dto/host-register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../user/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserService } from '../user/user.service';

// ─── User Auth ───────────────────────────────────────────────────────────────

@Controller('auth/user')
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: UserRegisterDto) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto, UserRole.USER);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

// ─── Host Auth ────────────────────────────────────────────────────────────────

@Controller('auth/host')
export class HostAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  register(@Body() dto: HostRegisterDto) {
    return this.authService.registerHost(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto, UserRole.HOST);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('upload-document')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('document'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    const result = await this.cloudinaryService.uploadFile(file, 'host-documents');
    await this.userService.update(user.id, { documentUrl: result.secure_url });
    return { message: 'Document uploaded successfully', url: result.secure_url };
  }
}
