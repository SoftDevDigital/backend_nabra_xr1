import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../common/services/mail.service';
import { Order } from '../schemas/order.schema';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class OrderNotificationService {
  private readonly logger = new Logger(OrderNotificationService.name);
  private template: HandlebarsTemplateDelegate;

  constructor(private readonly mailService: MailService) {
    this.loadTemplate();
  }

  private loadTemplate(): void {
    try {
      // Buscar en src primero, luego en dist
      const srcPath = path.join(process.cwd(), 'src/common/templates/order-confirmation.html');
      const distPath = path.join(__dirname, '../../common/templates/order-confirmation.html');
      
      let templatePath: string;
      if (fs.existsSync(srcPath)) {
        templatePath = srcPath;
      } else if (fs.existsSync(distPath)) {
        templatePath = distPath;
      } else {
        throw new Error(`Template not found in ${srcPath} or ${distPath}`);
      }
      
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      this.template = Handlebars.compile(templateSource);
      this.logger.log('Order confirmation template loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load order confirmation template:', error);
      throw new Error('Failed to load email template');
    }
  }

  async sendOrderConfirmationEmail(order: Order, customerEmail: string, customerName: string): Promise<void> {
    try {
      console.log(`📧 [EMAIL] Enviando email de confirmación de orden ${order.orderNumber} a: ${customerEmail}`);
      this.logger.log(`Sending order confirmation email for order ${order.orderNumber} to ${customerEmail}`);

      // Preparar datos para el template
      const templateData = {
        orderNumber: order.orderNumber,
        status: this.getStatusText(order.status),
        orderDate: this.formatDate((order as any).createdAt || new Date()),
        paymentMethod: this.getPaymentMethodText(order.paymentMethod),
        items: order.items.map(item => ({
          productSnapshot: item.productSnapshot,
          quantity: item.quantity,
          size: item.size,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: order.subtotal,
        discount: order.discount || 0,
        shippingCost: order.shippingCost || 0,
        tax: 0,
        total: order.total,
        currency: order.currency,
        shippingAddress: order.shippingAddress,
        shippingInfo: (order.shippingInfo && order.shippingCost > 0) ? {
          carrier: order.shippingInfo.carrier,
          service: order.shippingInfo.service,
          trackingNumber: order.shippingInfo.trackingNumber,
          estimatedDelivery: order.shippingInfo.estimatedDelivery,
          packages: order.shippingInfo.packages,
          insurance: order.shippingInfo.insurance,
        } : null,
        hasShipping: !!(order.shippingInfo && order.shippingCost > 0),
        customerName,
        customerEmail,
        orderId: order._id,
        frontendUrl: process.env.FRONTEND_BASE_URL || 'https://nabra.mx'
      };

      // Generar HTML del email
      const htmlContent = this.template(templateData);

      // Enviar email con retry logic
      console.log(`📧 [EMAIL] Ejecutando envío real de email a: ${customerEmail} con asunto: Confirmación de Pedido #${order.orderNumber} - Nabra`);
      
      let emailSent = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!emailSent && retryCount < maxRetries) {
        try {
          await this.mailService.sendMail({
            to: customerEmail,
            subject: `Confirmación de Pedido #${order.orderNumber} - Nabra`,
            html: htmlContent,
            text: this.generateTextVersion(templateData)
          });
          
          emailSent = true;
          console.log(`✅ [EMAIL] Email enviado exitosamente a: ${customerEmail} para orden ${order.orderNumber} (intento ${retryCount + 1})`);
          this.logger.log(`Order confirmation email sent successfully for order ${order.orderNumber}`);
        } catch (emailError) {
          retryCount++;
          console.log(`❌ [EMAIL] Error en intento ${retryCount}/${maxRetries} enviando email a: ${customerEmail}`, emailError);
          
          if (retryCount < maxRetries) {
            // Esperar antes del siguiente intento (backoff exponencial)
            const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
            console.log(`⏳ [EMAIL] Esperando ${delay}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.log(`❌ [EMAIL] Falló definitivamente el envío de email después de ${maxRetries} intentos`);
            this.logger.error(`Failed to send order confirmation email after ${maxRetries} attempts:`, emailError);
            // No lanzamos el error para no afectar la creación de la orden
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send order confirmation email for order ${order.orderNumber}:`, error);
      throw error;
    }
  }

  private getStatusText(status: string): string {
    const statusMap = {
      'pending': 'Pendiente',
      'paid': 'Pagado',
      'processing': 'Procesando',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  private getPaymentMethodText(paymentMethod: string): string {
    const methodMap = {
      'mercadopago': 'MercadoPago',
      'paypal': 'PayPal',
      'stripe': 'Stripe',
      'credit_card': 'Tarjeta de Crédito'
    };
    return methodMap[paymentMethod] || paymentMethod;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  private generateTextVersion(data: any): string {
      return `
¡Gracias por tu compra!

Pedido #${data.orderNumber}
Estado: ${data.status}
Fecha: ${data.orderDate}
Método de pago: ${data.paymentMethod}

Productos:
${data.items.map(item => `- ${item.productSnapshot.name}${item.size ? ` (Talla: ${item.size})` : ''} x${item.quantity} - $${item.total}`).join('\n')}

Resumen:
Subtotal: $${data.subtotal}
${data.discount > 0 ? `Descuento: -$${data.discount}\n` : ''}Envío: ${data.shippingCost > 0 ? `$${data.shippingCost}${data.shippingInfo ? ` (${data.shippingInfo.carrier} - ${data.shippingInfo.service})` : ''}` : 'Sin envío'}
Total: $${data.total} ${data.currency}

${data.shippingCost > 0 ? `
Información de envío:
Estado: ✓ Con envío
${data.shippingInfo ? `
- Transportista: ${data.shippingInfo.carrier}
- Servicio: ${data.shippingInfo.service}
${data.shippingInfo.trackingNumber ? `- Número de seguimiento: ${data.shippingInfo.trackingNumber}` : ''}
${data.shippingInfo.estimatedDelivery ? `- Entrega estimada: ${data.shippingInfo.estimatedDelivery}` : ''}
- Seguro: $${data.shippingInfo.insurance}` : ''}

Dirección de envío:
${data.shippingAddress.street}, ${data.shippingAddress.city}, ${data.shippingAddress.zip}, ${data.shippingAddress.country}
` : `
Información de envío:
Estado: ✗ Sin envío
Dirección registrada:
${data.shippingAddress.street}, ${data.shippingAddress.city}, ${data.shippingAddress.zip}, ${data.shippingAddress.country}
`}

Cliente: ${data.customerName} (${data.customerEmail})

Gracias por confiar en Nabra.
    `.trim();
  }
}
