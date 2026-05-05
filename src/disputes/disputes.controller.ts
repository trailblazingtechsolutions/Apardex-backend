import {
  Body,
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
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { CreateDisputeDto } from '../admin/dto/dispute.dto';

@ApiTags('Disputes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a dispute (user or host)' })
  @ApiResponse({ status: 201, description: 'Dispute created with DIS-XXXXXX ticket ID' })
  createDispute(
    @CurrentUser() user: User,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.createDispute(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all my submitted disputes' })
  getMyDisputes(@CurrentUser() user: User) {
    return this.disputesService.getMyDisputes(user.id);
  }

  @Get('my/:id')
  @ApiOperation({ summary: 'Get a specific dispute I submitted' })
  getMyDisputeById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.disputesService.getMyDisputeById(user.id, id);
  }

  @Delete('my/:id')
  @ApiOperation({ summary: 'Cancel an open dispute' })
  cancelDispute(@CurrentUser() user: User, @Param('id') id: string) {
    return this.disputesService.cancelDispute(user.id, id);
  }
}
