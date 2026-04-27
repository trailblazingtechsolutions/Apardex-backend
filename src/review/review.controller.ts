import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../user/user.entity';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Leave a review for a completed booking' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({
    status: 400,
    description: 'Booking not completed or not yours',
  })
  @ApiResponse({ status: 409, description: 'Already reviewed this booking' })
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.id, dto);
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Get all reviews for a property' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  findByProperty(@Param('propertyId') propertyId: string) {
    return this.reviewService.findByProperty(propertyId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all reviews I have written' })
  findMyReviews(@CurrentUser() user: User) {
    return this.reviewService.findByUser(user.id);
  }

  @Get('host')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all reviews across all host properties (Host only)' })
  findHostReviews(@CurrentUser() user: User) {
    return this.reviewService.findByHost(user.id);
  }
}
