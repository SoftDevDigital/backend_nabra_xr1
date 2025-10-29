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
        orderDate: this.formatDate(new Date((order as any).createdAt || new Date())),
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
        orderId: (order as any)._id?.toString() || 'N/A',
        status: this.getStatusText(order.status),
        orderDate: this.formatDate(new Date((order as any).createdAt || new Date())),
        paymentMethod: this.getPaymentMethodText(order.paymentMethod || 'mercadopago'),
        currency: order.currency || 'MXN',
        priority: order.priority || 'normal',
        source: order.source || 'web',
        
        // Información del cliente
        customerName: customerName || 'Cliente',
        customerEmail: customerEmail || 'No proporcionado',
        userId: order.userId?.toString() || 'N/A',
        customerPhone: order.shippingInfo?.contact?.phone || order.shippingAddress?.contact?.phone || 'No proporcionado',
        customerNotes: order.notes || 'Sin notas',
        
        // Productos con información completa
        items: order.items.map(item => ({
          productSnapshot: {
            name: item.productSnapshot?.name || 'Producto',
            description: item.productSnapshot?.description || '',
            price: item.productSnapshot?.price || 0,
            images: item.productSnapshot?.images || [],
            category: item.productSnapshot?.category || 'N/A',
            sku: item.productSnapshot?.sku || 'N/A',
            brand: item.productSnapshot?.brand || 'N/A'
          },
          quantity: item.quantity,
          size: item.size || 'N/A',
          total: (item.productSnapshot?.price || 0) * item.quantity
        })),
        
        // Totales
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        discount: order.discount || 0,
        shippingCost: order.shippingCost || 0,
        total: order.total || 0,
        couponCode: order.couponCode || null,
        appliedPromotions: order.appliedPromotions || [],
        
        // Información de envío completa
        shippingAddress: order.shippingAddress ? {
          street: order.shippingAddress.street || 'No especificada',
          addressLine2: order.shippingAddress.addressLine2 || '',
          city: order.shippingAddress.city || 'No especificada',
          state: order.shippingAddress.state || 'No especificada',
          zip: order.shippingAddress.zip || 'No especificado',
          country: order.shippingAddress.country || 'No especificado',
          neighborhood: (order.shippingAddress as any).neighborhood || '',
          references: (order.shippingAddress as any).references || ''
        } : {
          street: 'No especificada',
          addressLine2: '',
          city: 'No especificada',
          state: 'No especificada',
          zip: 'No especificado',
          country: 'No especificado',
          neighborhood: '',
          references: ''
        },
        
        // Información de envío detallada
        shippingInfo: order.shippingInfo ? {
          carrier: order.shippingInfo.carrier || 'Pendiente',
          service: order.shippingInfo.service || 'Pendiente',
          trackingNumber: order.shippingInfo.trackingNumber || 'Pendiente',
          estimatedDelivery: order.shippingInfo.estimatedDelivery || 'Pendiente',
          insurance: order.shippingInfo.insurance || 0,
          packages: order.shippingInfo.packages || [],
          contact: order.shippingInfo.contact || null,
          address: order.shippingInfo.address || null,
          shippingOption: order.shippingInfo.shippingOption || null
        } : null,
        
        // Información de pago detallada
        paymentStatus: order.paymentStatus || 'Pendiente',
        paymentDate: order.paymentDate ? this.formatDate(new Date(order.paymentDate)) : 'Pendiente',
        
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
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 30px -30px; }
        .header h1 { margin: 0; font-size: 28px; }
        .priority-urgent { background: #e74c3c !important; }
        .priority-high { background: #f39c12 !important; }
        .order-info { background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .customer-info { background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .contact-info { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .items-table th { background-color: #f8f9fa; font-weight: bold; }
        .total-section { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .shipping-info { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .payment-info { background: #f0f8ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .promotion-info { background: #f0fff0; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .action-buttons { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 12px 24px; margin: 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-warning { background: #ffc107; color: black; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        .highlight { color: #e74c3c; font-weight: bold; }
        .success { color: #27ae60; font-weight: bold; }
        .warning { color: #f39c12; font-weight: bold; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .product-image { width: 50px; height: 50px; object-fit: cover; border-radius: 5px; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-paid { background: #d4edda; color: #155724; }
        .status-processing { background: #cce5ff; color: #004085; }
        .status-shipped { background: #d1ecf1; color: #0c5460; }
        .status-delivered { background: #d4edda; color: #155724; }
        .status-cancelled { background: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header ${data.priority === 'urgent' ? 'priority-urgent' : data.priority === 'high' ? 'priority-high' : ''}">
          <h1>🛍️ Nueva Orden Recibida</h1>
          <p>Nabra - Sistema de Notificaciones</p>
          ${data.priority === 'urgent' ? '<p style="font-size: 18px; margin: 10px 0;">🚨 ORDEN URGENTE 🚨</p>' : ''}
          ${data.priority === 'high' ? '<p style="font-size: 16px; margin: 10px 0;">⚠️ ORDEN PRIORITARIA ⚠️</p>' : ''}
        </div>

        <div class="order-info">
          <h2>📋 Información de la Orden</h2>
          <div class="info-grid">
            <div>
              <p><strong>Número de Orden:</strong> <span class="highlight">#${data.orderNumber}</span></p>
              <p><strong>Estado:</strong> <span class="status-badge status-${data.status}">${data.status}</span></p>
              <p><strong>Fecha:</strong> ${data.orderDate}</p>
              <p><strong>Prioridad:</strong> ${data.priority || 'Normal'}</p>
            </div>
            <div>
              <p><strong>Método de Pago:</strong> ${data.paymentMethod}</p>
              <p><strong>ID de Pago:</strong> ${data.paymentId}</p>
              <p><strong>Estado de Pago:</strong> ${data.paymentStatus || 'Pendiente'}</p>
              <p><strong>Fecha de Pago:</strong> ${data.paymentDate || 'Pendiente'}</p>
            </div>
          </div>
        </div>

        <div class="customer-info">
          <h2>👤 Información del Cliente</h2>
          <div class="info-grid">
            <div>
              <p><strong>Nombre Completo:</strong> ${data.customerName}</p>
              <p><strong>Email:</strong> <a href="mailto:${data.customerEmail}">${data.customerEmail}</a></p>
              <p><strong>ID de Usuario:</strong> ${data.userId || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Fuente:</strong> ${data.source || 'Web'}</p>
              <p><strong>Prioridad:</strong> ${data.priority || 'Normal'}</p>
            </div>
          </div>
        </div>

        <div class="contact-info">
          <h2>📞 Información de Contacto</h2>
          <div class="info-grid">
            <div>
              <p><strong>Teléfono:</strong> ${data.customerPhone || 'No proporcionado'}</p>
              <p><strong>Notas del Cliente:</strong> ${data.customerNotes || 'Sin notas'}</p>
            </div>
            <div>
              <p><strong>Email Principal:</strong> <a href="mailto:${data.customerEmail}">${data.customerEmail}</a></p>
              <p><strong>ID de Usuario:</strong> ${data.userId || 'N/A'}</p>
            </div>
          </div>
        </div>

        <h2>🛒 Productos Pedidos</h2>
        <table class="items-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Producto</th>
              <th>SKU</th>
              <th>Categoría</th>
              <th>Talla</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td><img src="${item.productSnapshot.images?.[0] || '/placeholder.jpg'}" alt="${item.productSnapshot.name}" class="product-image"></td>
                <td>
                  <strong>${item.productSnapshot.name}</strong>
                  ${item.productSnapshot.description ? `<br><small>${item.productSnapshot.description}</small>` : ''}
                </td>
                <td>${item.productSnapshot.sku || 'N/A'}</td>
                <td>${item.productSnapshot.category || 'N/A'}</td>
                <td><strong>${item.size}</strong></td>
                <td><strong>${item.quantity}</strong></td>
                <td>$${item.productSnapshot.price}</td>
                <td><strong>$${item.total}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <h2>💰 Resumen de Pago</h2>
          <div class="info-grid">
            <div>
              <p><strong>Subtotal:</strong> $${data.subtotal}</p>
              <p><strong>Impuestos:</strong> $${data.tax || 0}</p>
              <p><strong>Envío:</strong> ${data.shippingCost > 0 ? `$${data.shippingCost}` : 'Sin envío'}</p>
            </div>
            <div>
              ${data.discount > 0 ? `<p><strong>Descuento:</strong> -$${data.discount}</p>` : ''}
              ${data.couponCode ? `<p><strong>Cupón:</strong> ${data.couponCode}</p>` : ''}
              <p><strong>Total:</strong> <span class="highlight">$${data.total} ${data.currency}</span></p>
            </div>
          </div>
        </div>

        ${data.appliedPromotions && data.appliedPromotions.length > 0 ? `
          <div class="promotion-info">
            <h2>🎉 Promociones Aplicadas</h2>
            ${data.appliedPromotions.map(promo => `
              <p><strong>${promo.code}:</strong> ${promo.description} - Descuento: $${promo.discount}</p>
            `).join('')}
          </div>
        ` : ''}

        <div class="shipping-info">
          <h2>🚚 Información de Envío</h2>
          <div class="info-grid">
            <div>
              <h3>📍 Dirección de Envío</h3>
              <p><strong>Calle:</strong> ${data.shippingAddress.street}</p>
              ${data.shippingAddress.addressLine2 ? `<p><strong>Dirección 2:</strong> ${data.shippingAddress.addressLine2}</p>` : ''}
              ${data.shippingAddress.neighborhood ? `<p><strong>Colonia:</strong> ${data.shippingAddress.neighborhood}</p>` : ''}
              <p><strong>Ciudad:</strong> ${data.shippingAddress.city}</p>
              <p><strong>Estado:</strong> ${data.shippingAddress.state}</p>
              <p><strong>Código Postal:</strong> ${data.shippingAddress.zip}</p>
              <p><strong>País:</strong> ${data.shippingAddress.country}</p>
              ${data.shippingAddress.references ? `<p><strong>Referencias:</strong> ${data.shippingAddress.references}</p>` : ''}
            </div>
            <div>
              <h3>📦 Detalles del Envío</h3>
              ${data.shippingInfo ? `
                <p><strong>Transportista:</strong> ${data.shippingInfo.carrier || 'Pendiente'}</p>
                <p><strong>Servicio:</strong> ${data.shippingInfo.service || 'Pendiente'}</p>
                <p><strong>Número de Seguimiento:</strong> ${data.shippingInfo.trackingNumber || 'Pendiente'}</p>
                <p><strong>Entrega Estimada:</strong> ${data.shippingInfo.estimatedDelivery || 'Pendiente'}</p>
                <p><strong>Seguro:</strong> $${data.shippingInfo.insurance || 0}</p>
                ${data.shippingInfo.packages ? `
                  <h4>📦 Paquetes:</h4>
                  ${data.shippingInfo.packages.map(pkg => `
                    <p><strong>${pkg.name}:</strong> ${pkg.width}x${pkg.height}x${pkg.length}cm, ${pkg.weight}kg - ${pkg.content} (${pkg.contentQuantity} unidades)</p>
                  `).join('')}
                ` : ''}
              ` : '<p><em>Información de envío pendiente</em></p>'}
            </div>
          </div>
        </div>

        <div class="payment-info">
          <h2>💳 Información de Pago Detallada</h2>
          <div class="info-grid">
            <div>
              <p><strong>Método:</strong> ${data.paymentMethod}</p>
              <p><strong>Estado:</strong> ${data.paymentStatus || 'Pendiente'}</p>
              <p><strong>Fecha de Pago:</strong> ${data.paymentDate || 'Pendiente'}</p>
            </div>
            <div>
              <p><strong>ID de Transacción:</strong> ${data.paymentId}</p>
              <p><strong>Moneda:</strong> ${data.currency}</p>
            </div>
          </div>
        </div>

        ${data.notes ? `
          <div class="order-info">
            <h2>📝 Notas Adicionales</h2>
            <p>${data.notes}</p>
          </div>
        ` : ''}

        <div class="action-buttons">
          <h2>🔧 Acciones Rápidas</h2>
          <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}/orders/${data.orderId}" class="btn btn-primary">Ver Orden Completa</a>
          <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}/orders/${data.orderId}/edit" class="btn btn-warning">Editar Estado</a>
          <a href="mailto:${data.customerEmail}?subject=Orden #${data.orderNumber}" class="btn btn-success">Contactar Cliente</a>
        </div>

        <div class="footer">
          <p>Este es un email automático del sistema de Nabra.</p>
          <p><strong>Fecha de envío:</strong> ${new Date().toLocaleString('es-ES')}</p>
          <p><strong>ID de Orden:</strong> ${data.orderId || 'N/A'}</p>
          <p>Por favor, procesa esta orden lo antes posible.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateAdminEmailText(data: any): string {
    return `
🛍️ NUEVA ORDEN RECIBIDA - NABRA
${data.priority === 'urgent' ? '🚨 ORDEN URGENTE 🚨' : data.priority === 'high' ? '⚠️ ORDEN PRIORITARIA ⚠️' : ''}

📋 INFORMACIÓN DE LA ORDEN
Número: #${data.orderNumber}
ID: ${data.orderId}
Estado: ${data.status}
Fecha: ${data.orderDate}
Prioridad: ${data.priority || 'Normal'}
Fuente: ${data.source || 'Web'}

👤 INFORMACIÓN DEL CLIENTE
Nombre: ${data.customerName}
Email: ${data.customerEmail}
ID Usuario: ${data.userId || 'N/A'}
Teléfono: ${data.customerPhone || 'No proporcionado'}
Fuente: ${data.source || 'Web'}
Prioridad: ${data.priority || 'Normal'}

🛒 PRODUCTOS PEDIDOS
${data.items.map(item => `
- ${item.productSnapshot.name} (${item.productSnapshot.category})
  SKU: ${item.productSnapshot.sku || 'N/A'}
  Talla: ${item.size} | Cantidad: ${item.quantity}
  Precio: $${item.productSnapshot.price} | Total: $${item.total}
  ${item.productSnapshot.description ? `Descripción: ${item.productSnapshot.description}` : ''}
`).join('')}

💰 RESUMEN DE PAGO
Subtotal: $${data.subtotal}
Impuestos: $${data.tax || 0}
${data.discount > 0 ? `Descuento: -$${data.discount}\n` : ''}${data.couponCode ? `Cupón: ${data.couponCode}\n` : ''}Envío: ${data.shippingCost > 0 ? `$${data.shippingCost}` : 'Sin envío'}
Total: $${data.total} ${data.currency}

${data.appliedPromotions && data.appliedPromotions.length > 0 ? `
🎉 PROMOCIONES APLICADAS
${data.appliedPromotions.map(promo => `- ${promo.code}: ${promo.description} - Descuento: $${promo.discount}`).join('\n')}
` : ''}

🚚 INFORMACIÓN DE ENVÍO
Dirección:
${data.shippingAddress.street}
${data.shippingAddress.addressLine2 ? `${data.shippingAddress.addressLine2}\n` : ''}${data.shippingAddress.neighborhood ? `Colonia: ${data.shippingAddress.neighborhood}\n` : ''}${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}
${data.shippingAddress.country}
${data.shippingAddress.references ? `Referencias: ${data.shippingAddress.references}\n` : ''}

${data.shippingInfo ? `
📦 DETALLES DEL ENVÍO
Transportista: ${data.shippingInfo.carrier || 'Pendiente'}
Servicio: ${data.shippingInfo.service || 'Pendiente'}
Seguimiento: ${data.shippingInfo.trackingNumber || 'Pendiente'}
Entrega Estimada: ${data.shippingInfo.estimatedDelivery || 'Pendiente'}
Seguro: $${data.shippingInfo.insurance || 0}
${data.shippingInfo.packages && data.shippingInfo.packages.length > 0 ? `
Paquetes:
${data.shippingInfo.packages.map(pkg => `- ${pkg.name}: ${pkg.width}x${pkg.height}x${pkg.length}cm, ${pkg.weight}kg - ${pkg.content} (${pkg.contentQuantity} unidades)`).join('\n')}
` : ''}
` : 'Información de envío pendiente'}

💳 INFORMACIÓN DE PAGO
Método: ${data.paymentMethod}
Estado: ${data.paymentStatus || 'Pendiente'}
Fecha: ${data.paymentDate || 'Pendiente'}
ID Transacción: ${data.paymentId}
Moneda: ${data.currency}

${data.notes ? `
📝 NOTAS ADICIONALES
${data.notes}
` : ''}

🔧 ACCIONES RÁPIDAS
- Ver orden completa: ${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}/orders/${data.orderId}
- Editar estado: ${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}/orders/${data.orderId}/edit
- Contactar cliente: mailto:${data.customerEmail}?subject=Orden #${data.orderNumber}

---
Este es un email automático del sistema de Nabra.
Fecha de envío: ${new Date().toLocaleString('es-ES')}
ID de Orden: ${data.orderId || 'N/A'}
Por favor, procesa esta orden lo antes posible.
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
