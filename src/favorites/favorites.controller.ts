import {
  Controller,
  Delete,
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
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('Favorites')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all favorited properties' })
  @ApiResponse({ status: 200, description: 'List of favorites' })
  findAll(@CurrentUser() user: User) {
    return this.favoritesService.findAll(user.id);
  }

  @Post(':propertyId')
  @ApiOperation({ summary: 'Add a property to favorites' })
  @ApiResponse({ status: 201, description: 'Added to favorites' })
  @ApiResponse({ status: 409, description: 'Already in favorites' })
  add(@CurrentUser() user: User, @Param('propertyId') propertyId: string) {
    return this.favoritesService.add(user.id, propertyId);
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Remove a property from favorites' })
  @ApiResponse({ status: 200, description: 'Removed from favorites' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  remove(@CurrentUser() user: User, @Param('propertyId') propertyId: string) {
    return this.favoritesService.remove(user.id, propertyId);
  }
}
