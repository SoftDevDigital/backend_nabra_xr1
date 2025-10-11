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
import { CartCheckoutDto } from './dtos/cart-checkout.dto';
import { MercadoPagoCheckoutDto } from './dtos/simple-shipping.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // ==================== PAYPAL ENDPOINTS (DESACTIVADOS - SOLO MERCADOPAGO) ====================
  // Los siguientes endpoints están comentados porque solo se usa MercadoPago
  
  // @Post('from-cart')
  // @HttpCode(HttpStatus.CREATED)
  // async createPaymentFromCart(
  //   @Request() req,
  //   @Body() checkoutDto: CartCheckoutDto,
  // ) {
  //   return this.paymentsService.createPaymentFromCart(
  //     req.user.userId,
  //     checkoutDto,
  //   );
  // }

  // @Post('partial-checkout')
  // @HttpCode(HttpStatus.CREATED)
  // async createPartialPaymentFromCart(
  //   @Request() req,
  //   @Body() partialCheckoutDto: PartialCheckoutDto,
  // ) {
  //   return this.paymentsService.createPartialPaymentFromCart(
  //     req.user.userId,
  //     partialCheckoutDto,
  //   );
  // }

  // @Post('webhook/paypal')
  // @HttpCode(HttpStatus.OK)
  // async paypalWebhook(@Body() webhookData: any) {
  //   console.log('PayPal webhook received:', webhookData);
  //   return { status: 'received' };
  // }

  @Public()
  @Post('webhook/mercadopago')
  @HttpCode(HttpStatus.OK)
  async mercadopagoWebhook(@Body() webhookData: any, @Query() query: any) {
    // MercadoPago envía notificaciones IPN (Instant Payment Notification)
    console.log('MercadoPago webhook received:', { body: webhookData, query });
    // Implementar manejo de eventos (payment.created, payment.updated, etc.)
    return { status: 'received' };
  }

  // ==================== MERCADOPAGO - ÚNICO MÉTODO DE PAGO ====================
  
  @Post('mercadopago/checkout')
  @HttpCode(HttpStatus.CREATED)
  async mercadoPagoCheckout(
    @Request() req,
    @Body() checkoutDto: MercadoPagoCheckoutDto,
  ) {
    // Genera el link de pago de MercadoPago desde el carrito
    return this.paymentsService.createMercadoPagoPaymentFromCartV2(
      req.user.userId,
      checkoutDto,
    );
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

  // Endpoints genéricos de pagos (disponibles para consultas)
  @Get(':paymentId')
  async getPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPayment(paymentId);
  }

  // PayPal specific endpoints (desactivados)
  // @Post()
  // @HttpCode(HttpStatus.CREATED)
  // async createPayment(
  //   @Request() req,
  //   @Body() createPaymentDto: CreatePaymentDto,
  // ) {
  //   return this.paymentsService.createPayment(req.user.userId, createPaymentDto);
  // }

  // @Post(':paymentId/capture')
  // @HttpCode(HttpStatus.OK)
  // async capturePayment(
  //   @Param('paymentId') paymentId: string,
  //   @Body() captureDto: PaymentCaptureDto,
  // ) {
  //   return this.paymentsService.capturePayment(paymentId, captureDto.payerId);
  // }

  // @Delete(':paymentId')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // async cancelPayment(@Param('paymentId') paymentId: string) {
  //   const success = await this.paymentsService.cancelPayment(paymentId);
  //   if (!success) {
  //     throw new BadRequestException('Failed to cancel payment');
  //   }
  // }
}
