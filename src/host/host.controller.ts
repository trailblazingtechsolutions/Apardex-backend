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
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HostService } from './host.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../user/user.entity';
import { AddPayoutMethodDto } from './dto/payout-method.dto';
import { PayoutPreferenceDto } from './dto/payout-preference.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('Host Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HOST)
@Controller('host')
export class HostController {
  constructor(private readonly hostService: HostService) {}

  // ─── Payout Methods ─────────────────────────────────────────────────────────

  @Get('payout-methods')
  @ApiOperation({ summary: 'List all payout methods' })
  getPayoutMethods(@CurrentUser() user: User) {
    return this.hostService.getPayoutMethods(user.id);
  }

  @Post('payout-methods')
  @ApiOperation({ summary: 'Add a payout method (bank account or Paystack wallet)' })
  addPayoutMethod(@CurrentUser() user: User, @Body() dto: AddPayoutMethodDto) {
    return this.hostService.addPayoutMethod(user.id, dto);
  }

  @Patch('payout-methods/:id/default')
  @ApiOperation({ summary: 'Set a payout method as default' })
  setDefaultPayoutMethod(@CurrentUser() user: User, @Param('id') id: string) {
    return this.hostService.setDefaultPayoutMethod(user.id, id);
  }

  @Delete('payout-methods/:id')
  @ApiOperation({ summary: 'Remove a payout method' })
  @ApiResponse({ status: 200, description: 'Payout method removed' })
  removePayoutMethod(@CurrentUser() user: User, @Param('id') id: string) {
    return this.hostService.removePayoutMethod(user.id, id);
  }

  // ─── Payout Preferences ─────────────────────────────────────────────────────

  @Get('payout-preferences')
  @ApiOperation({ summary: 'Get payout preferences (min amount, currency)' })
  getPayoutPreferences(@CurrentUser() user: User) {
    return this.hostService.getPayoutPreferences(user.id);
  }

  @Patch('payout-preferences')
  @ApiOperation({ summary: 'Update payout preferences' })
  updatePayoutPreferences(
    @CurrentUser() user: User,
    @Body() dto: PayoutPreferenceDto,
  ) {
    return this.hostService.updatePayoutPreferences(user.id, dto);
  }

  // ─── Payout History ─────────────────────────────────────────────────────────

  @Get('payouts')
  @ApiOperation({ summary: 'Get payout history' })
  getPayouts(@CurrentUser() user: User) {
    return this.hostService.getPayouts(user.id);
  }

  // ─── Documents / KYC ────────────────────────────────────────────────────────

  @Get('documents')
  @ApiOperation({ summary: 'List uploaded documents and their review status' })
  getDocuments(@CurrentUser() user: User) {
    return this.hostService.getDocuments(user.id);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an identity/KYC document from the host profile',
    description:
      'Submitting a document places the host in the admin KYC review queue. A host whose KYC was rejected returns to pending on re-upload.',
  })
  @ApiResponse({ status: 400, description: 'Document file is required' })
  uploadDocument(
    @CurrentUser() user: User,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.hostService.uploadDocument(user.id, dto, file);
  }

  // ─── Active Sessions / Logout All ───────────────────────────────────────────

  @Post('logout-all-devices')
  @ApiOperation({ summary: 'Invalidate all sessions on other devices' })
  @ApiResponse({ status: 200, description: 'All other devices logged out' })
  logoutAllDevices(@CurrentUser() user: User) {
    return this.hostService.logoutAllDevices(user.id);
  }
}
