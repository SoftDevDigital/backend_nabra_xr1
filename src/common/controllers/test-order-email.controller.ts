import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { OrderNotificationService } from '../../orders/services/order-notification.service';
import { Public } from '../decorators/public.decorator';

@ApiTags('Testing')
@Controller('test')
export class TestOrderEmailController {
  private readonly logger = new Logger(TestOrderEmailController.name);

  constructor(private readonly orderNotificationService: OrderNotificationService) {}

  @Public()
  @ApiOperation({ 
    summary: 'Enviar email de prueba', 
    description: 'Envía un email de confirmación de orden de prueba (solo para desarrollo/testing).' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', example: 'test@example.com', description: 'Email destinatario' },
        orderNumber: { type: 'string', example: 'ORD-2025-000001', description: 'Número de orden de prueba' },
        customerName: { type: 'string', example: 'Juan Pérez', description: 'Nombre del cliente' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Email enviado exitosamente' })
  @Post('order-email')
  async sendTestOrderEmail(@Body() body: { 
    to?: string; 
    orderNumber?: string;
    customerName?: string;
  }) {
    try {
      const to = body.to || 'alexis@laikad.com';
      const orderNumber = body.orderNumber || 'ORD-2025-000001';
      const customerName = body.customerName || 'Alexis Correa';

      // Crear una orden de prueba
      const mockOrder = {
        _id: '68d70277a18f0149d2a3a27e',
        orderNumber,
        status: 'paid',
        items: [
          {
            productSnapshot: {
              name: 'Zapatos Deportivos',
              description: 'Cómodos y elegantes',
              price: 100,
              images: ['https://www.stockcenter.com.ar/on/demandware.static/-/Sites-365-dabra-catalog/default/dw2482a904/products/PU397395-03/PU397395-03-6.JPG'],
              category: 'zapatos',
              brand: 'Nike',
              sku: 'NIKE-001'
            },
            quantity: 2,
            size: '39',
            price: 100,
            reservedStock: 2,
            stockReleased: false
          }
        ],
        subtotal: 200,
        tax: 0,
        discount: 0,
        shippingCost: 0,
        total: 200,
        currency: 'MXN',
        paymentMethod: 'mercadopago',
        paymentStatus: 'approved',
        paymentDate: new Date(),
        shippingAddress: {
          street: 'Av. Principal 123',
          city: 'Buenos Aires',
          zip: '1000',
          country: 'Mexico'
        },
        customerEmail: to,
        customerName,
        source: 'web',
        priority: 'normal',
        createdAt: new Date()
      };

      await this.orderNotificationService.sendOrderConfirmationEmail(
        mockOrder as any,
        to,
        customerName
      );

      return {
        success: true,
        message: 'Email de confirmación de orden enviado exitosamente',
        to,
        orderNumber,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error sending test order email:', error);
      return {
        success: false,
        message: 'Error al enviar email de confirmación',
        error: error.message,
      };
    }
  }
}
