import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

export interface MpItem {
  id?: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private mpClient: MercadoPagoConfig;
  private preference: Preference;
  private payment: Payment;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    const integratorId = this.configService.get<string>('MERCADOPAGO_INTEGRATOR_ID');
    
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is required. Please check your .env file.');
    }
    
    this.mpClient = new MercadoPagoConfig({ 
      accessToken: accessToken,
      options: integratorId ? { integratorId } : undefined,
    } as any);
    this.preference = new Preference(this.mpClient);
    this.payment = new Payment(this.mpClient);
  }

  async createCheckoutPreference(params: {
    items: MpItem[];
    externalReference?: string;
    notificationUrl: string;
    backUrls: { success: string; failure: string; pending: string };
    autoReturn?: 'approved' | 'all';
    currency?: string;
  }): Promise<{ id: string; init_point: string }> {
    const { items, externalReference, notificationUrl, backUrls } = params;
    // Usar MXN (pesos mexicanos) como moneda predeterminada
    // La moneda se puede configurar vía parámetro, variable de entorno o por defecto MXN
    const currency = params.currency || process.env.MERCADOPAGO_CURRENCY || 'MXN';

    const response = await this.preference.create({
      body: {
        items: items.map((it) => ({
          id: it.id || it.title,
          title: it.title,
          description: it.description,
          quantity: it.quantity,
          unit_price: Number(it.unit_price.toFixed(2)),
          currency_id: currency,
        })),
        back_urls: backUrls,
        notification_url: notificationUrl,
        external_reference: externalReference,
        // Nota: Omitimos auto_return para evitar validación estricta de back_urls.success en entornos locales
        binary_mode: (process.env.MP_BINARY_MODE || 'true').toLowerCase() === 'true',
        metadata: { env: process.env.NODE_ENV || 'development' },
      },
    });

    const prefId = (response as any)?.id || (response as any)?.response?.id;
    const initPoint = (response as any)?.init_point || (response as any)?.response?.init_point;

    if (!prefId || !initPoint) {
      this.logger.error('Critical error: Failed to create Mercado Pago preference');
      throw new Error('No se pudo crear la preferencia de pago');
    }

    return { id: prefId, init_point: initPoint };
  }

  async getPaymentById(paymentId: string): Promise<any> {
    const result = await this.payment.get({ id: paymentId });
    return (result as any)?.response || result;
  }
}


