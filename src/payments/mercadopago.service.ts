import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mercadopago from 'mercadopago';

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

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    mercadopago.configure({
      access_token: accessToken || '',
    });
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

    const preference = {
      items: items.map((it) => ({
        id: it.id || it.title,
        title: it.title,
        description: it.description,
        quantity: it.quantity,
        unit_price: Number(it.unit_price.toFixed(2)),
        currency_id: currency as any,
      })),
      back_urls: backUrls,
      notification_url: notificationUrl,
      external_reference: externalReference,
      // Nota: Omitimos auto_return para evitar validación estricta de back_urls.success en entornos locales
      binary_mode: (process.env.MP_BINARY_MODE || 'true').toLowerCase() === 'true',
      metadata: { env: process.env.NODE_ENV || 'development' },
    };

    const response = await mercadopago.preferences.create(preference);

    if (!response.body?.id || !response.body?.init_point) {
      this.logger.error('Critical error: Failed to create Mercado Pago preference');
      throw new Error('No se pudo crear la preferencia de pago');
    }

    return { id: response.body.id, init_point: response.body.init_point };
  }

  async getPaymentById(paymentId: string): Promise<any> {
    const result = await mercadopago.payment.get(Number(paymentId));
    return result.body || result;
  }
}



