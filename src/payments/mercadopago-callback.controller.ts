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
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { Public } from '../common/decorators/public.decorator';
import { MercadoPagoCheckoutDto } from './dtos/simple-shipping.dto';

@Controller('payments/mercadopago')
export class MercadoPagoCallbackController {
  private readonly logger = new Logger(MercadoPagoCallbackController.name);

  constructor(
    private paymentsService: PaymentsService,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Endpoint para crear un checkout de MercadoPago desde el carrito
   */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async createCheckout(
    @Request() req,
    @Body() checkoutDto: MercadoPagoCheckoutDto,
  ) {
    try {
      this.logger.log(`Creating MercadoPago checkout for user ${req.user.userId}`);
      
      // Convertir simpleShipping a shippingAddress y shippingContact
      const cartCheckout: any = {
        returnUrl: checkoutDto.returnUrl,
        cancelUrl: checkoutDto.cancelUrl,
      };

      if (checkoutDto.simpleShipping) {
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
      const result = await this.paymentsService.createMercadoPagoPaymentFromCart(
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
      await this.paymentsService.updatePaymentStatus(internalPaymentId, 'completed');
      this.logger.log(`Payment ${internalPaymentId} marked as COMPLETED`);

      // LIMPIAR EL CARRITO DEL USUARIO (solo cuando el pago es exitoso)
      const userId = payment.userId.toString();
      await this.paymentsService.clearUserCart(userId);
      this.logger.log(`Cart cleared for user ${userId}`);

      // RESTAR STOCK: Descontar el stock de los productos SOLO cuando el pago es exitoso
      try {
        for (const item of payment.items) {
          if (item.productId) {
            // Restar el stock del producto
            await this.paymentsService.decrementProductStock(item.productId, item.quantity);
            this.logger.log(`Stock decremented for product ${item.productId}: ${item.quantity} units`);
          }
        }
      } catch (stockError) {
        this.logger.error('Error decrementing stock:', stockError);
        // No lanzar error, continuar con la creación de la orden
        // TODO: Implementar compensación si falla (reversar pago o notificar admin)
      }

      // Crear la orden automáticamente con la info guardada en metadata
      try {
        const orderData = {
          userId: payment.userId.toString(),
          paymentId: payment._id?.toString() || '',
          items: payment.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            productId: item.productId, // Ahora pasamos el productId correcto
          })),
          totalAmount: payment.amount,
          currency: payment.currency,
          shippingAddress: payment.metadata?.shippingAddress || {
            street: 'Pending',
            city: 'Pending',
            zip: 'Pending',
            country: 'Pending',
          },
          shippingContact: payment.metadata?.shippingContact,
          shippingOption: payment.metadata?.shippingOption,
        };

        const order = await this.ordersService.createOrderFromPayment(orderData);
        const orderId = (order as any)._id.toString();
        this.logger.log(`Order ${orderId} created automatically from payment ${internalPaymentId}`);

        // Enviar email de confirmación al cliente
        try {
          const orderNumber = orderId.slice(-8).toUpperCase();
          const emailData = {
            orderNumber,
            userName: payment.metadata?.shippingContact?.firstName || 'Cliente',
            userEmail: payment.metadata?.shippingContact?.email || 'no-email',
            total: payment.amount,
            products: payment.items,
            shippingAddress: payment.metadata?.shippingAddress,
            paymentMethod: 'MercadoPago',
            orderDate: new Date().toLocaleDateString('es-MX'),
          };

          // Crear y enviar notificación
          const notification = await this.notificationsService.createNotification({
            userId: payment.userId.toString(),
            title: 'Orden Confirmada',
            content: `Tu orden #${orderNumber} ha sido confirmada exitosamente`,
            type: 'order' as any,
            channel: 'EMAIL' as any,
            templateData: emailData,
          });

          if (notification) {
            await this.notificationsService.sendNotification((notification as any)._id.toString());
            this.logger.log(`Email notification sent for order ${orderId}`);
          }
        } catch (emailError) {
          this.logger.error('Error sending email:', emailError);
          // No lanzar error, el pago y orden ya están creados
        }

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
  @Get('failure')
  async handleFailure(
    @Query('payment_id') paymentId: string,
    @Query('status') status: string,
    @Query('external_reference') externalReference: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.warn(`MercadoPago failure callback received: payment_id=${paymentId}, status=${status}`);

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

