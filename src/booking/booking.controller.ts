import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ModifyBookingDto } from './dto/modify-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../user/user.entity';
import { BookingStatus } from './booking.entity';

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    return this.bookingService.create(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiQuery({ name: 'status', enum: BookingStatus, required: false })
  getMyBookings(
    @CurrentUser() user: User,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingService.findUserBookings(user.id, status);
  }

  @Get('host')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HOST)
  @ApiOperation({ summary: 'Get all bookings for host properties' })
  @ApiQuery({ name: 'status', enum: BookingStatus, required: false })
  getHostBookings(
    @CurrentUser() user: User,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingService.findHostBookings(user.id, status);
  }

  @Get('host/revenue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HOST)
  @ApiOperation({ summary: 'Get monthly revenue breakdown for last 12 months (Host only)' })
  getHostRevenue(@CurrentUser() user: User) {
    return this.bookingService.getHostRevenue(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('reason') reason?: string,
  ) {
    return this.bookingService.cancel(id, user.id, reason);
  }

  @Patch(':id/modify')
  @ApiOperation({ summary: 'Modify booking dates or guests' })
  @ApiResponse({ status: 200, description: 'Booking modified' })
  modify(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ModifyBookingDto,
  ) {
    return this.bookingService.modify(id, user.id, dto);
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HOST)
  @ApiOperation({ summary: 'Confirm a pending booking (Host only)' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  @ApiResponse({ status: 403, description: 'Not your property' })
  confirmByHost(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.confirmByHost(id, user.id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HOST)
  @ApiOperation({ summary: 'Reject a booking (Host only)' })
  @ApiResponse({ status: 200, description: 'Booking rejected' })
  @ApiResponse({ status: 403, description: 'Not your property' })
  rejectByHost(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('reason') reason?: string,
  ) {
    return this.bookingService.rejectByHost(id, user.id, reason);
  }
}
