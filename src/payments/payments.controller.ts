import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Request,
  Query,
  Res,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../common/decorators/public.decorator';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentCaptureDto } from './dtos/payment-response.dto';
import { PartialCheckoutDto } from './dtos/partial-checkout.dto';
import { PaymentWithShippingDto } from './dtos/payment-with-shipping.dto';
import { CheckoutWithShippingDto } from './dtos/checkout-with-shipping.dto';
import { MercadoPagoService } from './mercadopago.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Payments')
@ApiBearerAuth('bearer')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    private mpService: MercadoPagoService,
  ) {}


  // Mercado Pago Checkout Pro
  @ApiOperation({ summary: 'Checkout Pro (MP)', description: 'Crea preferencia de pago en Mercado Pago Checkout Pro. Incluye automáticamente costo de envío si se proporcionan datos de envío.' })
  @ApiBody({ type: CheckoutWithShippingDto, required: false })
  @Post('mercadopago/checkout')
  @HttpCode(HttpStatus.CREATED)
  async createMpCheckout(
    @Request() req,
    @Body() checkoutData?: CheckoutWithShippingDto,
  ) {
    return this.paymentsService.createMercadoPagoCheckoutFromCart(
      req.user.userId,
      checkoutData || {},
    );
  }

  @ApiOperation({ summary: 'Checkout Pro parcial (MP)', description: 'Preferencia de pago parcial en Mercado Pago.' })
  @ApiBody({ type: PartialCheckoutDto })
  @Post('mercadopago/partial-checkout')
  @HttpCode(HttpStatus.CREATED)
  async createMpPartialCheckout(
    @Request() req,
    @Body() partialCheckoutDto: PartialCheckoutDto,
  ) {
    return this.paymentsService.createMercadoPagoPartialCheckoutFromCart(
      req.user.userId,
      partialCheckoutDto,
    );
  }


  @ApiOperation({ summary: 'Webhook Mercado Pago', description: 'Recibe notificaciones de Mercado Pago. Debe validar encabezados `x-signature` y `x-request-id`. El body puede incluir `id`/`type` o `resource`. Frontend no llama este endpoint.' })
  @Post('webhook/mercadopago')
  @Public()
  @HttpCode(HttpStatus.OK)
  async mercadoPagoWebhook(@Query() query: any, @Body() body: any, @Request() req: any) {
    // MP puede enviar query params (type=data.id/topic) y body con resource
    const headers = {
      'x-signature': req.headers['x-signature'],
      'x-request-id': req.headers['x-request-id'],
      'user-agent': req.headers['user-agent'],
    };
    return this.paymentsService.handleMercadoPagoWebhook(query, body, headers);
  }

  @ApiOperation({ summary: 'Return URL (MP)', description: 'Redirección desde MP. Frontend debe leer `url` en respuesta para redirigir (en este backend devolvemos un objeto con `statusCode: 302` y `url`).' })
  @ApiQuery({ name: 'payment_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'merchant_order_id', required: false })
  @ApiQuery({ name: 'external_reference', required: false })
  @Get('mercadopago/return')
  @Public()
  async mercadoPagoReturn(
    @Query('payment_id') paymentId?: string,
    @Query('status') status?: string,
    @Query('merchant_order_id') merchantOrderId?: string,
    @Query('external_reference') externalReference?: string,
    @Request() req?: any,
    @Res() res?: any,
  ) {
    const result = await this.paymentsService.handleMercadoPagoReturn({
      paymentId,
      status,
      merchantOrderId,
      externalReference,
    });
    // Redirigir al frontend
    return res.redirect(result.redirectUrl);
  }

  @ApiOperation({ summary: 'Listar mis pagos', description: 'Devuelve pagos del usuario autenticado con paginación.' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
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

  // ========================================
  // ENDPOINT ADMINISTRATIVO: Liberación manual de reservas
  // ========================================

  @ApiOperation({ 
    summary: 'Liberar reservas expiradas (Admin)', 
    description: 'Libera manualmente todas las reservas expiradas. Útil para testing o situaciones especiales.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Reservas liberadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        released: { type: 'number', description: 'Número de reservas liberadas' },
        errors: { type: 'number', description: 'Número de errores encontrados' },
        details: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Detalles de cada operación'
        }
      }
    }
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('admin/release-expired-reservations')
  @HttpCode(HttpStatus.OK)
  async releaseExpiredReservations(@Request() req) {
    this.logger.log(`🔧 [ADMIN] ${req.user.email} ejecutando liberación manual de reservas`);
    return this.paymentsService.manuallyReleaseExpiredReservations();
  }

}
