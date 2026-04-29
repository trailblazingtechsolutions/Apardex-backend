import {
  Body,
  Controller,
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

@ApiTags('User Auth')
@Controller('auth/user')
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto, UserRole.USER);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
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
    return this.authService.resendVerificationOtp(dto.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'Reset OTP sent if email exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

// ─── Host Auth ────────────────────────────────────────────────────────────────

@ApiTags('Host Auth')
@Controller('auth/host')
export class HostAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Register a new host (document upload required)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'email', 'password', 'phoneNumber', 'document'],
      properties: {
        fullName: { type: 'string', example: 'Jane Smith' },
        email: { type: 'string', example: 'jane@example.com' },
        password: { type: 'string', example: 'password123' },
        phoneNumber: { type: 'string', example: '+2348012345678' },
        document: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'OTP sent to email' })
  @ApiResponse({ status: 400, description: 'Document file is required' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  register(
    @Body() dto: HostRegisterDto,
    @UploadedFile() document: Express.Multer.File,
  ) {
    return this.authService.registerHost(dto, document);
  }

  @Post('login')
  @ApiOperation({ summary: 'Host login' })
  @ApiResponse({ status: 200, description: 'Returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto, UserRole.HOST);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify host email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
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
    return this.authService.resendVerificationOtp(dto.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'Reset OTP sent if email exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('upload-document')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload host identity document (requires auth)' })
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
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    @CurrentUser() user: User,
  ) {
    const result = await this.cloudinaryService.uploadFile(
      file,
      'host-documents',
    );
    await this.userService.update(user.id, { documentUrl: result.secure_url });
    return {
      message: 'Document uploaded successfully',
      url: result.secure_url,
    };
  }
}
