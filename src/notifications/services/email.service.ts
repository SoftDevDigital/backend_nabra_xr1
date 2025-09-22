import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailData {
  to: string;
  subject: string;
  content: string;
  templateData?: Record<string, any>;
  htmlContent?: string;
  plainTextContent?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      this.logger.log(`Sending email to ${emailData.to} with subject: ${emailData.subject}`);

      // En un entorno real, aquí integrarías con:
      // - SendGrid
      // - Mailgun
      // - AWS SES
      // - Nodemailer con SMTP

      // Por ahora, simulamos el envío
      const messageId = this.generateMessageId();
      
      // Simular delay de red
      await this.delay(100);

      // Simular éxito (en producción, manejar errores reales)
      const success = Math.random() > 0.1; // 90% de éxito

      if (success) {
        this.logger.log(`Email sent successfully. Message ID: ${messageId}`);
        return {
          success: true,
          messageId,
        };
      } else {
        this.logger.error(`Failed to send email to ${emailData.to}`);
        return {
          success: false,
          error: 'Failed to send email',
        };
      }
    } catch (error) {
      this.logger.error('Error sending email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBulkEmail(emailDataList: EmailData[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const emailData of emailDataList) {
      const result = await this.sendEmail(emailData);
      results.push(result);
    }

    return results;
  }

  async sendTemplateEmail(
    templateId: string,
    to: string,
    templateData: Record<string, any>
  ): Promise<EmailResult> {
    try {
      // En producción, cargar template desde base de datos o servicio
      const template = await this.getEmailTemplate(templateId);
      
      const subject = this.processTemplate(template.subject, templateData);
      const content = this.processTemplate(template.content, templateData);
      const htmlContent = template.htmlContent 
        ? this.processTemplate(template.htmlContent, templateData)
        : undefined;

      return this.sendEmail({
        to,
        subject,
        content,
        htmlContent,
        templateData,
      });
    } catch (error) {
      this.logger.error('Error sending template email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async getEmailStats(dateFrom?: Date, dateTo?: Date): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  }> {
    // En producción, obtener estadísticas del proveedor de email
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
    };
  }

  private async getEmailTemplate(templateId: string): Promise<{
    subject: string;
    content: string;
    htmlContent?: string;
  }> {
    // En producción, cargar desde base de datos
    const templates: Record<string, any> = {
      'welcome': {
        subject: '¡Bienvenido a {{storeName}}!',
        content: 'Hola {{userName}}, ¡bienvenido a {{storeName}}!',
        htmlContent: '<h1>¡Bienvenido {{userName}}!</h1><p>Gracias por registrarte en {{storeName}}.</p>',
      },
      'order_confirmed': {
        subject: 'Confirmación de pedido #{{orderNumber}}',
        content: 'Tu pedido #{{orderNumber}} ha sido confirmado por un total de ${{total}}.',
        htmlContent: '<h2>Pedido Confirmado</h2><p>Tu pedido #{{orderNumber}} ha sido confirmado.</p>',
      },
      'order_shipped': {
        subject: 'Tu pedido #{{orderNumber}} ha sido enviado',
        content: 'Tu pedido #{{orderNumber}} ha sido enviado. Código de seguimiento: {{trackingNumber}}.',
      },
      'password_reset': {
        subject: 'Restablecer contraseña',
        content: 'Haz clic en el enlace para restablecer tu contraseña: {{resetLink}}',
      },
    };

    const template = templates[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return template;
  }

  private processTemplate(content: string, data: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
