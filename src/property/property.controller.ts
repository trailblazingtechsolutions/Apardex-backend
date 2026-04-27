import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { BlockDatesDto } from './dto/block-dates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../user/user.entity';
import { PropertyStatus } from './property.entity';

@ApiTags('Properties')
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Search and list properties (public)' })
  @ApiResponse({ status: 200, description: 'Paginated list of properties' })
  search(@Query() dto: SearchPropertyDto) {
    return this.propertyService.search(dto);
  }

  @Get('featured')
  @ApiOperation({
    summary: 'Get featured properties for the landing page (public)',
  })
  @ApiResponse({ status: 200, description: 'Top rated active properties' })
  getFeatured() {
    return this.propertyService.findFeatured();
  }

  // ─── Host endpoints (must come before :id to avoid route collision) ────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new property listing (Host only)' })
  @ApiResponse({ status: 201, description: 'Property created' })
  @ApiResponse({ status: 403, description: 'Host role required' })
  create(@CurrentUser() user: User, @Body() dto: CreatePropertyDto) {
    return this.propertyService.create(user.id, dto);
  }

  @Get('host/my-listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get all listings for the logged-in host (Host only)',
  })
  @ApiResponse({ status: 200, description: 'Host listings' })
  @ApiResponse({ status: 403, description: 'Host role required' })
  getMyListings(@CurrentUser() user: User) {
    return this.propertyService.findByHost(user.id);
  }

  // ─── Availability / Calendar ──────────────────────────────────────────────

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get blocked dates for a property (public)' })
  @ApiResponse({ status: 200, description: 'List of blocked dates' })
  getBlockedDates(@Param('id') id: string) {
    return this.propertyService.getBlockedDates(id);
  }

  @Post(':id/availability/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Block dates on a property (Host only)' })
  @ApiResponse({ status: 201, description: 'Dates blocked' })
  blockDates(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: BlockDatesDto,
  ) {
    return this.propertyService.blockDates(id, user.id, dto.dates, dto.reason);
  }

  @Delete(':id/availability/:date')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unblock a date on a property (Host only)' })
  @ApiResponse({ status: 200, description: 'Date unblocked' })
  unblockDate(
    @Param('id') id: string,
    @Param('date') date: string,
    @CurrentUser() user: User,
  ) {
    return this.propertyService.unblockDate(id, user.id, date);
  }

  // ─── Public parameterized endpoint (after all static routes) ─────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single property by ID (public)' })
  @ApiResponse({ status: 200, description: 'Property details' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  findOne(@Param('id') id: string) {
    return this.propertyService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a property listing (Host only)' })
  @ApiResponse({ status: 200, description: 'Property updated' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(id, user.id, dto);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload property images (max 10, Host only)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Images uploaded' })
  uploadImages(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @UploadedFiles()
    files: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }[],
  ) {
    return this.propertyService.uploadImages(id, user.id, files);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a property listing (Host only)' })
  @ApiResponse({ status: 200, description: 'Property deleted' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertyService.remove(id, user.id);
  }

  @Patch(':id/visibility')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Activate or deactivate own listing (Host only)',
    description: 'Allowed values: active | inactive',
  })
  @ApiResponse({ status: 200, description: 'Visibility updated' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  updateVisibility(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('status') status: PropertyStatus.ACTIVE | PropertyStatus.INACTIVE,
  ) {
    return this.propertyService.updateVisibility(id, user.id, status);
  }

  // ─── Admin endpoints ───────────────────────────────────────────────────────

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update property status to any value (Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: PropertyStatus,
  ) {
    return this.propertyService.updateStatus(id, status);
  }
}
