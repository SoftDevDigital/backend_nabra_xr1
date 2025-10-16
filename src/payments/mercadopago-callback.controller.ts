import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  Res,
  HttpStatus,
  HttpCode,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';


import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { Public } from '../common/decorators/public.decorator';
import { MercadoPagoCheckoutDto } from './dtos/mercadopago-checkout.dto';
import { PaymentStatus } from './schemas/payment.schema';
import { CartService } from '../cart/cart.service';

@ApiTags('Payments - MercadoPago')
@Controller('payments/mercadopago')
export class MercadoPagoCallbackController {
  private readonly logger = new Logger(MercadoPagoCallbackController.name);

  constructor(
    private paymentsService: PaymentsService,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    private notificationsService: NotificationsService,
    private cartService: CartService,
    @Inject(forwardRef(() => ProductsService)) private productsService: ProductsService,
  ) {}

  /**
   * Endpoint para crear un checkout de MercadoPago desde el carrito
   */
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Crear checkout de MercadoPago', 
    description: 'Crea una preferencia de pago de MercadoPago desde el carrito del usuario con información de envío.' 
  })
  @ApiBody({ type: MercadoPagoCheckoutDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Checkout creado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { 
          type: 'object',
          properties: {
            init_point: { type: 'string', description: 'URL de checkout de MercadoPago' },
            id: { type: 'string', description: 'ID de la preferencia' }
          }
        }
      }
    }
  })
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async createCheckout(
    @Request() req,
    @Body() checkoutDto: MercadoPagoCheckoutDto,
  ) {
    try {
      this.logger.log(`Creating MercadoPago checkout for user ${req.user.userId}`);
      
      // Preparar datos de checkout con envío
      const cartCheckout: any = {
        returnUrl: checkoutDto.returnUrl,
        cancelUrl: checkoutDto.cancelUrl,
      };

      // Pasar simpleShipping completo para que se guarde en metadata
      if (checkoutDto.simpleShipping) {
        cartCheckout.simpleShipping = checkoutDto.simpleShipping;
        
        // También convertir a formato shippingAddress y shippingContact para compatibilidad
        cartCheckout.shippingAddress = {
          street: checkoutDto.simpleShipping.address.addressLine,
          city: checkoutDto.simpleShipping.address.city,
          zip: checkoutDto.simpleShipping.address.postalCode,
          country: checkoutDto.simpleShipping.address.country,
          state: checkoutDto.simpleShipping.address.state,
        };

        cartCheckout.shippingContact = {
          email: checkoutDto.simpleShipping.contact.emailOrPhone,
          firstName: checkoutDto.simpleShipping.contact.firstName,
          lastName: checkoutDto.simpleShipping.contact.lastName,
          phone: checkoutDto.simpleShipping.contact.phone,
        };
      }

      if (checkoutDto.shippingOption) {
        cartCheckout.shippingOption = checkoutDto.shippingOption;
      }

      // Crear el pago de MercadoPago desde el carrito
      const result = await this.paymentsService.createMercadoPagoCheckoutFromCart(
        req.user.userId,
        cartCheckout
      );

      return {
        success: true,
        data: result,
        message: 'MercadoPago checkout created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating MercadoPago checkout:', error);
      throw error;
    }
  }

  /**
   * Callback de éxito de MercadoPago
   * MercadoPago redirige aquí después de que el usuario aprueba el pago
   */
  @Public()
  @ApiOperation({ 
    summary: 'Callback de éxito', 
    description: 'Callback automático de MercadoPago cuando el pago es aprobado. Crea la orden y limpia el carrito. NO es llamado por el frontend.' 
  })
  @ApiQuery({ name: 'payment_id', required: false, description: 'ID del pago en MercadoPago' })
  @ApiQuery({ name: 'status', required: false, description: 'Estado del pago' })
  @ApiQuery({ name: 'external_reference', required: false, description: 'Referencia externa' })
  @ApiQuery({ name: 'merchant_order_id', required: false, description: 'ID de orden de comercio' })
  @ApiQuery({ name: 'preference_id', required: false, description: 'ID de preferencia' })
  @ApiResponse({ status: 302, description: 'Redirección al frontend con resultado del pago' })
  @Get('success')
  async handleSuccess(
    @Query('payment_id') paymentId: string,
    @Query('status') status: string,
    @Query('external_reference') externalReference: string,
    @Query('merchant_order_id') merchantOrderId: string,
    @Query('preference_id') preferenceId: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`MercadoPago success callback: payment_id=${paymentId}, status=${status}, preference=${preferenceId}`);

      // Buscar el pago en la DB usando el preferenceId
      const payment = await this.paymentsService.findByMercadoPagoPreference(preferenceId || externalReference);
      
      if (!payment) {
        this.logger.error(`Payment not found for preference: ${preferenceId}`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/payment/error?message=Payment+not+found`);
      }

      // Verificar que el pago fue aprobado por MercadoPago
      // Status puede ser: 'approved', 'pending', 'rejected', 'in_process'
      if (status !== 'approved') {
        this.logger.warn(`Payment ${payment._id} not approved. Status: ${status}`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/payment/pending?status=${status}`);
      }

      // Actualizar estado del pago a COMPLETED solo si está aprobado
      const internalPaymentId = (payment as any)._id.toString();
      await this.paymentsService.updatePaymentStatus(internalPaymentId, PaymentStatus.COMPLETED);
      this.logger.log(`Payment ${internalPaymentId} marked as COMPLETED`);

      // LIMPIAR EL CARRITO DEL USUARIO (solo cuando el pago es exitoso)
      const userId = payment.userId.toString();
      await this.cartService.clearCart(userId);
      this.logger.log(`Cart cleared for user ${userId}`);

      // IMPORTANTE: El stock fue reservado al crear el checkout.
      // Ahora que el pago es exitoso, el stock reservado se convierte en vendido.
      // No necesitamos hacer nada más - el stock ya está descontado.

      // Crear la orden automáticamente con la info guardada en metadata
      try {
        // Extraer email y nombre del cliente desde metadata
        const customerEmail = payment.metadata?.shippingContact?.email || 
                            payment.metadata?.shippingContact?.emailOrPhone || 
                            payment.metadata?.simpleShipping?.contact?.email ||
                            payment.metadata?.simpleShipping?.contact?.emailOrPhone;
        
        const customerFirstName = payment.metadata?.shippingContact?.firstName || 
                                payment.metadata?.simpleShipping?.contact?.firstName || 
                                'Cliente';
        const customerLastName = payment.metadata?.shippingContact?.lastName || 
                               payment.metadata?.simpleShipping?.contact?.lastName || 
                               '';
        const customerName = `${customerFirstName} ${customerLastName}`.trim();

        // Construir dirección de envío
        let shippingAddress = payment.metadata?.shippingAddress;
        
        // Si no hay shippingAddress pero sí simpleShipping, convertirlo
        if (!shippingAddress && payment.metadata?.simpleShipping?.address) {
          const addr = payment.metadata.simpleShipping.address;
          shippingAddress = {
            street: addr.addressLine,
            city: addr.city,
            zip: addr.postalCode,
            country: addr.country,
            state: addr.state,
          };
        }

        // Si aún no hay dirección, usar valores por defecto
        if (!shippingAddress) {
          shippingAddress = {
            street: 'Pending',
            city: 'Pending',
            zip: 'Pending',
            country: 'Pending',
            state: 'Pending',
          };
        }

        // Construir datos de la orden
        const orderData = {
          userId: payment.userId.toString(),
          paymentId: payment._id?.toString() || '',
          items: payment.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            productId: item.productId,
            size: item.size,
          })),
          totalAmount: payment.amount,
          currency: payment.currency,
          customerEmail: customerEmail || undefined, // Email del cliente para enviar confirmación
          customerName: customerName || undefined, // Nombre del cliente
          shippingAddress: shippingAddress,
          simpleShipping: payment.metadata?.simpleShipping || null,
          shippingData: payment.metadata?.shippingData || null,
          shippingOption: payment.metadata?.shippingOption || null,
          shippingCost: payment.metadata?.shippingCost || 0,
        };

        console.log(`📧 [CALLBACK] Creando orden con email: ${customerEmail}, nombre: ${customerName}`);
        
        // Crear orden (OrdersService enviará el email automáticamente)
        const order = await this.ordersService.createOrderFromPayment(orderData);
        const orderId = (order as any)._id.toString();
        this.logger.log(`Order ${orderId} created from payment ${internalPaymentId}. Email will be sent by OrdersService.`);

        // NOTA: No enviamos email aquí porque OrdersService.createOrderFromPayment 
        // ya lo hace automáticamente usando OrderNotificationService (emails reales)

      } catch (orderError) {
        this.logger.error('Error creating order from payment:', orderError);
        // No lanzar error para no afectar la redirección
      }

      // Redirigir al frontend con éxito
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/payment/success?payment_id=${paymentId}&status=${status}&external_reference=${externalReference}`;
      
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Error handling MercadoPago success callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Callback de fallo de MercadoPago
   */
  @Public()
  @ApiOperation({ 
    summary: 'Callback de fallo', 
    description: 'Callback de MercadoPago cuando el pago falla o es rechazado. NO es llamado por el frontend.' 
  })
  @ApiQuery({ name: 'payment_id', required: false, description: 'ID del pago en MercadoPago' })
  @ApiQuery({ name: 'status', required: false, description: 'Estado del pago' })
  @ApiQuery({ name: 'external_reference', required: false, description: 'Referencia externa' })
  @ApiResponse({ status: 302, description: 'Redirección al frontend con mensaje de error' })
  @Get('failure')
  async handleFailure(
    @Query('payment_id') paymentId: string,
    @Query('status') status: string,
    @Query('external_reference') externalReference: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.warn(`MercadoPago failure callback received: payment_id=${paymentId}, status=${status}`);

      // Buscar el pago y liberar stock si es necesario
      try {
        const payment = await this.paymentsService.findByMercadoPagoPreference(externalReference);
        if (payment && payment.status === 'pending') {
          console.log(`🔄 [FAILURE-CALLBACK] Liberando stock reservado para pago fallido: ${payment._id}`);
          
          // Liberar stock reservado
          for (const item of payment.items) {
            if (item.productId && item.size) {
              await this.productsService.releaseStock(item.productId, item.quantity, item.size);
              console.log(`✅ [FAILURE-CALLBACK] Stock liberado: ${item.productId} - Talle ${item.size} - Cantidad ${item.quantity}`);
            }
          }
          
          // Marcar pago como cancelado
          await this.paymentsService.updatePaymentStatus((payment as any)._id.toString(), PaymentStatus.CANCELLED, `Payment failed with status: ${status}`);
          console.log(`✅ [FAILURE-CALLBACK] Pago marcado como cancelado y stock liberado`);
        }
      } catch (stockError) {
        console.error(`❌ [FAILURE-CALLBACK] Error liberando stock:`, stockError);
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/payment/failure?payment_id=${paymentId}&status=${status}&external_reference=${externalReference}`;
      
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Error handling MercadoPago failure callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Callback de pago pendiente de MercadoPago
   */
  @Public()
  @ApiOperation({ 
    summary: 'Callback de pago pendiente', 
    description: 'Callback de MercadoPago cuando el pago queda en estado pendiente. NO es llamado por el frontend.' 
  })
  @ApiQuery({ name: 'payment_id', required: false, description: 'ID del pago en MercadoPago' })
  @ApiQuery({ name: 'status', required: false, description: 'Estado del pago' })
  @ApiQuery({ name: 'external_reference', required: false, description: 'Referencia externa' })
  @ApiResponse({ status: 302, description: 'Redirección al frontend indicando estado pendiente' })
  @Get('pending')
  async handlePending(
    @Query('payment_id') paymentId: string,
    @Query('status') status: string,
    @Query('external_reference') externalReference: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`MercadoPago pending callback received: payment_id=${paymentId}, status=${status}`);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/payment/pending?payment_id=${paymentId}&status=${status}&external_reference=${externalReference}`;
      
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Error handling MercadoPago pending callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent(error.message)}`);
    }
  }
}

