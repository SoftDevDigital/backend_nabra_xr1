import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Request,
  Query,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentCaptureDto } from './dtos/payment-response.dto';
import { PartialCheckoutDto } from './dtos/partial-checkout.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('from-cart')
  @HttpCode(HttpStatus.CREATED)
  async createPaymentFromCart(
    @Request() req,
    @Query('returnUrl') returnUrl?: string,
    @Query('cancelUrl') cancelUrl?: string,
  ) {
    return this.paymentsService.createPaymentFromCart(
      req.user.userId,
      returnUrl,
      cancelUrl,
    );
  }

  @Post('partial-checkout')
  @HttpCode(HttpStatus.CREATED)
  async createPartialPaymentFromCart(
    @Request() req,
    @Body() partialCheckoutDto: PartialCheckoutDto,
  ) {
    return this.paymentsService.createPartialPaymentFromCart(
      req.user.userId,
      partialCheckoutDto,
    );
  }

  @Post('webhook/paypal')
  @HttpCode(HttpStatus.OK)
  async paypalWebhook(@Body() webhookData: any) {
    // Implementar manejo de eventos (completed/failed/cancelled/etc.)
    console.log('PayPal webhook received:', webhookData);
    return { status: 'received' };
  }

  @Get()
  async getUserPayments(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const limitNum = limit ? parseInt(limit.toString(), 10) : 10;
    const offsetNum = offset ? parseInt(offset.toString(), 10) : 0;

    if (limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (offsetNum < 0) {
      throw new BadRequestException('Offset must be 0 or greater');
    }

    return this.paymentsService.getUserPayments(
      req.user.userId,
      limitNum,
      offsetNum,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(req.user.userId, createPaymentDto);
  }

  @Post(':paymentId/capture')
  @HttpCode(HttpStatus.OK)
  async capturePayment(
    @Param('paymentId') paymentId: string,
    @Body() captureDto: PaymentCaptureDto,
  ) {
    return this.paymentsService.capturePayment(paymentId, captureDto.payerId);
  }

  @Get(':paymentId')
  async getPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPayment(paymentId);
  }

  @Delete(':paymentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelPayment(@Param('paymentId') paymentId: string) {
    const success = await this.paymentsService.cancelPayment(paymentId);
    if (!success) {
      throw new BadRequestException('Failed to cancel payment');
    }
    // 204 No Content → sin body
  }
}
