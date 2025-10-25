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

  // ===== NOTIFICACIÓN AL ADMIN =====

  async sendAdminNotificationEmail(order: Order, customerEmail: string, customerName: string): Promise<void> {
    try {
      console.log(`📧 [ADMIN EMAIL] Preparando notificación de nueva orden #${order.orderNumber} para admin`);
      
      // Datos para el template del admin
      const templateData = {
        orderNumber: order.orderNumber,
        status: this.getStatusText(order.status),
        orderDate: this.formatDate((order as any).createdAt || new Date()),
        paymentMethod: this.getPaymentMethodText(order.paymentMethod || 'mercadopago'),
        currency: order.currency || 'MXN',
        
        // Información del cliente
        customerName: customerName || 'Cliente',
        customerEmail: customerEmail || 'No proporcionado',
        
        // Productos
        items: order.items.map(item => ({
          productSnapshot: {
            name: item.productSnapshot?.name || 'Producto',
            price: item.productSnapshot?.price || 0
          },
          quantity: item.quantity,
          size: item.size || 'N/A',
          total: (item.productSnapshot?.price || 0) * item.quantity
        })),
        
        // Totales
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        shippingCost: order.shippingCost || 0,
        total: order.total || 0,
        
        // Información de envío
        shippingAddress: order.shippingAddress ? {
          street: order.shippingAddress.street || 'No especificada',
          city: order.shippingAddress.city || 'No especificada',
          state: order.shippingAddress.state || 'No especificada',
          zip: order.shippingAddress.zip || 'No especificado',
          country: order.shippingAddress.country || 'No especificado',
          neighborhood: (order.shippingAddress as any).neighborhood || '',
          references: (order.shippingAddress as any).references || ''
        } : {
          street: 'No especificada',
          city: 'No especificada',
          state: 'No especificada',
          zip: 'No especificado',
          country: 'No especificado',
          neighborhood: '',
          references: ''
        },
        
        // Información de envío (si aplica)
        shippingInfo: order.shippingInfo ? {
          carrier: order.shippingInfo.carrier || 'No especificado',
          service: order.shippingInfo.service || 'No especificado',
          trackingNumber: order.shippingInfo.trackingNumber || 'Pendiente',
          estimatedDelivery: order.shippingInfo.estimatedDelivery || 'Pendiente',
          insurance: order.shippingInfo.insurance || 0
        } : null,
        
        // Información adicional
        notes: order.notes || 'Sin notas adicionales',
        paymentId: order.paymentId || 'No disponible'
      };

      // Generar HTML del email para admin
      const htmlContent = this.generateAdminEmailHTML(templateData);

      // Enviar email al admin
      console.log(`📧 [ADMIN EMAIL] Enviando notificación a contact@nabra.mx para orden #${order.orderNumber}`);
      
      let emailSent = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!emailSent && retryCount < maxRetries) {
        try {
          await this.mailService.sendMail({
            to: 'contact@nabra.mx',
            subject: `🛍️ Nueva Orden #${order.orderNumber} - ${customerName} - $${order.total} ${order.currency || 'MXN'}`,
            html: htmlContent,
            text: this.generateAdminEmailText(templateData)
          });
          
          emailSent = true;
          console.log(`✅ [ADMIN EMAIL] Notificación enviada exitosamente a contact@nabra.mx para orden ${order.orderNumber} (intento ${retryCount + 1})`);
          this.logger.log(`Admin notification email sent successfully for order ${order.orderNumber}`);
        } catch (emailError) {
          retryCount++;
          console.log(`❌ [ADMIN EMAIL] Error en intento ${retryCount}/${maxRetries} enviando notificación a contact@nabra.mx`, emailError);
          
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`⏳ [ADMIN EMAIL] Esperando ${delay}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.log(`❌ [ADMIN EMAIL] Falló definitivamente el envío de notificación después de ${maxRetries} intentos`);
            this.logger.error(`Failed to send admin notification email after ${maxRetries} attempts:`, emailError);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send admin notification email for order ${order.orderNumber}:`, error);
      // No lanzamos el error para no afectar la creación de la orden
    }
  }

  private generateAdminEmailHTML(data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nueva Orden - Nabra</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 30px -30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .order-info { background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .customer-info { background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .items-table th { background-color: #f8f9fa; font-weight: bold; }
        .total-section { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .shipping-info { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        .highlight { color: #e74c3c; font-weight: bold; }
        .success { color: #27ae60; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛍️ Nueva Orden Recibida</h1>
          <p>Nabra - Sistema de Notificaciones</p>
        </div>

        <div class="order-info">
          <h2>📋 Información de la Orden</h2>
          <p><strong>Número de Orden:</strong> <span class="highlight">#${data.orderNumber}</span></p>
          <p><strong>Estado:</strong> <span class="success">${data.status}</span></p>
          <p><strong>Fecha:</strong> ${data.orderDate}</p>
          <p><strong>Método de Pago:</strong> ${data.paymentMethod}</p>
          <p><strong>ID de Pago:</strong> ${data.paymentId}</p>
        </div>

        <div class="customer-info">
          <h2>👤 Información del Cliente</h2>
          <p><strong>Nombre:</strong> ${data.customerName}</p>
          <p><strong>Email:</strong> ${data.customerEmail}</p>
        </div>

        <h2>🛒 Productos Pedidos</h2>
        <table class="items-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Talla</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.productSnapshot.name}</td>
                <td>${item.size}</td>
                <td>${item.quantity}</td>
                <td>$${item.productSnapshot.price}</td>
                <td>$${item.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <h2>💰 Resumen de Pago</h2>
          <p><strong>Subtotal:</strong> $${data.subtotal}</p>
          ${data.discount > 0 ? `<p><strong>Descuento:</strong> -$${data.discount}</p>` : ''}
          <p><strong>Envío:</strong> ${data.shippingCost > 0 ? `$${data.shippingCost}` : 'Sin envío'}</p>
          <p><strong>Total:</strong> <span class="highlight">$${data.total} ${data.currency}</span></p>
        </div>

        <div class="shipping-info">
          <h2>🚚 Información de Envío</h2>
          <p><strong>Dirección:</strong></p>
          <p>${data.shippingAddress.street}</p>
          ${data.shippingAddress.neighborhood ? `<p>Colonia: ${data.shippingAddress.neighborhood}</p>` : ''}
          <p>${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}</p>
          <p>${data.shippingAddress.country}</p>
          ${data.shippingAddress.references ? `<p><strong>Referencias:</strong> ${data.shippingAddress.references}</p>` : ''}
          
          ${data.shippingInfo ? `
            <h3>📦 Detalles del Envío</h3>
            <p><strong>Transportista:</strong> ${data.shippingInfo.carrier}</p>
            <p><strong>Servicio:</strong> ${data.shippingInfo.service}</p>
            <p><strong>Número de Seguimiento:</strong> ${data.shippingInfo.trackingNumber}</p>
            <p><strong>Entrega Estimada:</strong> ${data.shippingInfo.estimatedDelivery}</p>
            <p><strong>Seguro:</strong> $${data.shippingInfo.insurance}</p>
          ` : ''}
        </div>

        ${data.notes ? `
          <div class="order-info">
            <h2>📝 Notas Adicionales</h2>
            <p>${data.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Este es un email automático del sistema de Nabra.</p>
          <p>Por favor, procesa esta orden lo antes posible.</p>
          <p><strong>Fecha de envío:</strong> ${new Date().toLocaleString('es-ES')}</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateAdminEmailText(data: any): string {
    return `
🛍️ NUEVA ORDEN RECIBIDA - NABRA

📋 INFORMACIÓN DE LA ORDEN
Número: #${data.orderNumber}
Estado: ${data.status}
Fecha: ${data.orderDate}
Método de Pago: ${data.paymentMethod}
ID de Pago: ${data.paymentId}

👤 INFORMACIÓN DEL CLIENTE
Nombre: ${data.customerName}
Email: ${data.customerEmail}

🛒 PRODUCTOS PEDIDOS
${data.items.map(item => `- ${item.productSnapshot.name} (Talla: ${item.size}) x${item.quantity} - $${item.total}`).join('\n')}

💰 RESUMEN DE PAGO
Subtotal: $${data.subtotal}
${data.discount > 0 ? `Descuento: -$${data.discount}\n` : ''}Envío: ${data.shippingCost > 0 ? `$${data.shippingCost}` : 'Sin envío'}
Total: $${data.total} ${data.currency}

🚚 INFORMACIÓN DE ENVÍO
Dirección:
${data.shippingAddress.street}
${data.shippingAddress.neighborhood ? `Colonia: ${data.shippingAddress.neighborhood}\n` : ''}${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}
${data.shippingAddress.country}
${data.shippingAddress.references ? `Referencias: ${data.shippingAddress.references}\n` : ''}

${data.shippingInfo ? `
📦 DETALLES DEL ENVÍO
Transportista: ${data.shippingInfo.carrier}
Servicio: ${data.shippingInfo.service}
Número de Seguimiento: ${data.shippingInfo.trackingNumber}
Entrega Estimada: ${data.shippingInfo.estimatedDelivery}
Seguro: $${data.shippingInfo.insurance}
` : ''}

${data.notes ? `📝 NOTAS ADICIONALES\n${data.notes}\n` : ''}

---
Este es un email automático del sistema de Nabra.
Por favor, procesa esta orden lo antes posible.
Fecha de envío: ${new Date().toLocaleString('es-ES')}
    `.trim();
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
