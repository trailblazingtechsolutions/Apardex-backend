import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('Messaging')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  send(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.messagingService.send(user.id, dto);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get inbox (received messages)' })
  getInbox(@CurrentUser() user: User) {
    return this.messagingService.getInbox(user.id);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message count' })
  getUnreadCount(@CurrentUser() user: User) {
    return this.messagingService.getUnreadCount(user.id);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get conversation with a specific user' })
  getConversation(@CurrentUser() user: User, @Param('userId') otherId: string) {
    return this.messagingService.getConversation(user.id, otherId);
  }

  @Patch(':userId/read')
  @ApiOperation({ summary: 'Mark all messages from a user as read' })
  markAsRead(@CurrentUser() user: User, @Param('userId') otherId: string) {
    return this.messagingService.markAsRead(user.id, otherId);
  }
}
