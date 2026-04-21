import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Initiate a payment for a booking',
    description:
      'Non-NGN payments are automatically routed to Flutterwave regardless of chosen provider.',
  })
  @ApiResponse({ status: 201, description: 'Payment URL returned' })
  initiate(@CurrentUser() user: User, @Body() dto: InitiatePaymentDto) {
    return this.paymentService.initiate(user.id, user.email, dto);
  }

  @Post('webhook/:provider')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook endpoint for payment providers (do not call directly)',
  })
  async webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: Record<string, unknown>,
  ) {
    const headers = req.headers as Record<string, string>;
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));
    await this.paymentService.handleWebhook(provider, headers, rawBody, body);
    return { received: true };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all my payment records' })
  getMyPayments(@CurrentUser() user: User) {
    return this.paymentService.findMyPayments(user.id);
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get payment record for a specific booking' })
  getByBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentService.findByBooking(bookingId, user.id);
  }
}
