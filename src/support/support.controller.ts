import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateConversationDto, ReplyMessageDto } from './dto/support.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('Support')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('support/conversations')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @ApiOperation({ summary: 'Open a new support conversation' })
  create(@CurrentUser() user: User, @Body() dto: CreateConversationDto) {
    return this.supportService.createConversation(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my support conversations' })
  list(@CurrentUser() user: User) {
    return this.supportService.getUserConversations(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation thread' })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.supportService.getUserConversationById(user.id, id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a support conversation' })
  reply(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReplyMessageDto,
  ) {
    return this.supportService.userReply(user.id, id, dto);
  }
}
