import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments/paypal')
export class PayPalCallbackController {
  constructor(private paymentsService: PaymentsService) {}

  @Public()
  @Get('success')
  async paymentSuccess(
    @Query('token') token: string,
    @Query('PayerID') payerId: string,
  ) {
    console.log('PayPal Token (Payment ID):', token);
    console.log('Payer ID:', payerId);
    
    try {
      if (!token || !payerId) {
        throw new BadRequestException('Missing payment parameters');
      }

      // En PayPal, el 'token' es el ID del payment/order
      const result = await this.paymentsService.capturePaymentByToken(token, payerId);
      
      return {
        success: true,
        message: 'Payment completed successfully',
        payment: result,
      };
    } catch (error: any) {
      console.error('Payment success error:', error);
      return {
        success: false,
        message: 'Payment failed',
        error: error.message,
      };
    }
  }

  // GET /payments/paypal/cancel → redirección de cancelación
  @Public()
  @Get('cancel')
  async paymentCancel(@Query('token') token: string) {
    console.log('PayPal Cancel Token:', token);
    
    try {
      if (!token) {
        throw new BadRequestException('Missing payment token');
      }

      // Marcar el pago como cancelado usando el token de PayPal
      await this.paymentsService.cancelPaymentByToken(token);

      return {
        success: true,
        message: 'Payment cancelled successfully',
        token,
      };
    } catch (error: any) {
      console.error('Payment cancel error:', error);
      return {
        success: false,
        message: 'Error processing cancellation',
        error: error.message,
      };
    }
  }
}
