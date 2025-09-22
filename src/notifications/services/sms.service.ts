import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsData {
  to: string;
  message: string;
  templateData?: Record<string, any>;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  async sendSms(smsData: SmsData): Promise<SmsResult> {
    try {
      this.logger.log(`Sending SMS to ${smsData.to}`);

      // En un entorno real, aquí integrarías con:
      // - Twilio
      // - AWS SNS
      // - MessageBird
      // - Nexmo (Vonage)

      // Por ahora, simulamos el envío
      const messageId = this.generateMessageId();
      
      // Simular delay de red
      await this.delay(200);

      // Simular éxito (en producción, manejar errores reales)
      const success = Math.random() > 0.15; // 85% de éxito

      if (success) {
        this.logger.log(`SMS sent successfully. Message ID: ${messageId}`);
        return {
          success: true,
          messageId,
        };
      } else {
        this.logger.error(`Failed to send SMS to ${smsData.to}`);
        return {
          success: false,
          error: 'Failed to send SMS',
        };
      }
    } catch (error) {
      this.logger.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBulkSms(smsDataList: SmsData[]): Promise<SmsResult[]> {
    const results: SmsResult[] = [];

    // Procesar en lotes para evitar límites de rate
    const batchSize = 10;
    for (let i = 0; i < smsDataList.length; i += batchSize) {
      const batch = smsDataList.slice(i, i + batchSize);
      
      const batchPromises = batch.map(smsData => this.sendSms(smsData));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Delay entre lotes
      if (i + batchSize < smsDataList.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  async sendTemplateSms(
    templateId: string,
    to: string,
    templateData: Record<string, any>
  ): Promise<SmsResult> {
    try {
      // En producción, cargar template desde base de datos o servicio
      const template = await this.getSmsTemplate(templateId);
      
      const message = this.processTemplate(template.message, templateData);

      return this.sendSms({
        to,
        message,
        templateData,
      });
    } catch (error) {
      this.logger.error('Error sending template SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    // Validación básica para números argentinos
    const phoneRegex = /^\+?54[0-9]{10}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  async formatPhoneNumber(phoneNumber: string): Promise<string> {
    // Formatear número argentino
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('54')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+54${cleaned.substring(1)}`;
    } else if (cleaned.length === 10) {
      return `+54${cleaned}`;
    }
    
    return phoneNumber;
  }

  async getSmsStats(dateFrom?: Date, dateTo?: Date): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }> {
    // En producción, obtener estadísticas del proveedor de SMS
    return {
      sent: 0,
      delivered: 0,
      failed: 0,
      cost: 0,
    };
  }

  private async getSmsTemplate(templateId: string): Promise<{
    message: string;
  }> {
    // En producción, cargar desde base de datos
    const templates: Record<string, any> = {
      'order_confirmed': {
        message: 'Tu pedido #{{orderNumber}} ha sido confirmado. Total: ${{total}}. {{storeName}}',
      },
      'order_shipped': {
        message: 'Tu pedido #{{orderNumber}} ha sido enviado. Seguimiento: {{trackingNumber}}. {{storeName}}',
      },
      'payment_failed': {
        message: 'El pago de tu pedido #{{orderNumber}} falló. Por favor, intenta nuevamente. {{storeName}}',
      },
      'security_alert': {
        message: 'Alerta de seguridad: Se detectó un inicio de sesión desde {{location}}. Si no fuiste tú, contacta soporte.',
      },
      'verification_code': {
        message: 'Tu código de verificación es: {{code}. Válido por 10 minutos. {{storeName}}',
      },
      'promotion': {
        message: '¡Oferta especial! {{promotionText}} Válido hasta {{expiryDate}}. {{storeName}}',
      },
    };

    const template = templates[templateId];
    if (!template) {
      throw new Error(`SMS template ${templateId} not found`);
    }

    return template;
  }

  private processTemplate(content: string, data: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private generateMessageId(): string {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
