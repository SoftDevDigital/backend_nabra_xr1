import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  template?: 'plain';
  subject: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  text?: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const fallbackFrom = this.configService.get<string>('zoho.user') || '';
    this.fromAddress = this.configService.get<string>('zoho.from') || fallbackFrom;
  }

  private ensureTransporter(): void {
    if (this.transporter) return;

    const host = this.configService.get<string>('zoho.host');
    const port = this.configService.get<number>('zoho.port');
    const secure = this.configService.get<boolean>('zoho.secure');
    const user = this.configService.get<string>('zoho.user');
    const pass = this.configService.get<string>('zoho.pass');

    // Si no hay configuración, crear un transporter dummy que no hace nada
    if (!host || !port || !user || !pass) {
      this.logger.warn('Zoho SMTP configuration not found. Email sending will be disabled.');
      this.logger.warn('To enable email sending, set ZOHO_SMTP_PASS environment variable.');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: true,
    });
  }

  async sendMail(options: SendMailOptions): Promise<{ messageId: string }> {
    try {
      console.log(`📧 [MAIL SERVICE] Iniciando envío de email a: ${options.to}, asunto: ${options.subject}`);
      this.ensureTransporter();
      
      // Si no hay transporter configurado, simular envío exitoso
      if (!this.transporter) {
        console.log(`⚠️ [MAIL SERVICE] Email deshabilitado - se habría enviado a: ${options.to}, asunto: ${options.subject}`);
        this.logger.warn(`Email sending disabled - would have sent to: ${options.to}, subject: ${options.subject}`);
        return { messageId: 'disabled-' + Date.now() };
      }

      const mailOptions: nodemailer.SendMailOptions = {
        from: this.fromAddress,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@nabra.mx>',
          'Return-Path': this.fromAddress,
        },
        priority: 'normal',
        encoding: 'utf8',
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ [MAIL SERVICE] Email enviado exitosamente! Message ID: ${info.messageId} a: ${options.to}`);
      this.logger.log(`Mail sent: ${info.messageId}`);
      return { messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send mail: ${error.message}`, error.stack);
      throw new Error(`Failed to send mail: ${error.message}`);
    }
  }
}