import {
  Controller,
  Post,
  Get,
  Put,
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

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(req.user.userId, createPaymentDto);
  }

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

  @Get()
  async getUserPayments(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const limitNum = limit ? parseInt(limit.toString()) : 10;
    const offsetNum = offset ? parseInt(offset.toString()) : 0;

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

  @Delete(':paymentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelPayment(@Param('paymentId') paymentId: string) {
    const success = await this.paymentsService.cancelPayment(paymentId);
    if (!success) {
      throw new BadRequestException('Failed to cancel payment');
    }
    return { message: 'Payment cancelled successfully' };
  }

  // Webhook endpoints para PayPal (para uso futuro)
  @Post('webhook/paypal')
  @HttpCode(HttpStatus.OK)
  async paypalWebhook(@Body() webhookData: any) {
    // Implementar webhook de PayPal para notificaciones automáticas
    // Esto se puede implementar más adelante para manejar eventos como:
    // - Payment completed
    // - Payment failed
    // - Payment cancelled
    console.log('PayPal webhook received:', webhookData);
    return { status: 'received' };
  }

  // Endpoints para redirección después del pago
  @Get('success')
  async paymentSuccess(
    @Query('paymentId') paymentId: string,
    @Query('PayerID') payerId: string,
  ) {
    try {
      if (!paymentId || !payerId) {
        throw new BadRequestException('Missing payment parameters');
      }

      const result = await this.paymentsService.capturePayment(paymentId, payerId);
      return {
        success: true,
        message: 'Payment completed successfully',
        payment: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Payment failed',
        error: error.message,
      };
    }
  }

  @Get('cancel')
  async paymentCancel(@Query('token') token: string) {
    try {
      // Marcar el pago como cancelado
      const payments = await this.paymentsService.getUserPayments('', 1, 0);
      const payment = payments.find(p => p.providerPaymentId === token);
      
      if (payment) {
        await this.paymentsService.updatePaymentStatus(
          payment._id?.toString() || '',
          'cancelled' as any,
          'Payment cancelled by user'
        );
      }

      return {
        success: true,
        message: 'Payment cancelled',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error processing cancellation',
        error: error.message,
      };
    }
  }
}
