import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { drenvioConfig } from '../config/drenvio.config';
import { 
  DrEnvioRateRequestDto, 
  DrEnvioRateResponseDto, 
  DrEnvioCreateShipmentDto, 
  DrEnvioShipmentResponseDto,
  DrEnvioShipmentStatusDto 
} from './dtos/drenvio-rate.dto';

@Injectable()
export class DrEnvioRealService {
  private readonly logger = new Logger(DrEnvioRealService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = drenvioConfig.apiUrl;
    this.apiKey = drenvioConfig.apiKey;
  }

  // ===== HEADERS =====
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  // ===== OBTENER COTIZACIONES =====
  async getShippingRates(
    origin: any,
    destination: any,
    packages: any[],
    carriers: string[] = ['fedex', 'estafeta'],
    insurance: number = 100,
  ): Promise<DrEnvioRateResponseDto[]> {
    try {
      this.logger.log('Getting shipping rates from DrEnvío');

      const requestData: DrEnvioRateRequestDto = {
        type: 'National',
        origin: {
          country: origin.country || 'MX',
          postal_code: origin.postal_code || origin.postalCode,
          state: origin.state,
          city: origin.city,
          address: origin.address,
          contact: origin.contact || {
            name: drenvioConfig.companyInfo.name,
            phone: drenvioConfig.companyInfo.contact.phone,
            email: drenvioConfig.companyInfo.contact.email,
          }
        },
        destination: {
          country: destination.country || 'MX',
          postal_code: destination.postal_code || destination.postalCode,
          state: destination.state,
          city: destination.city,
          address: destination.address,
          contact: destination.contact || {
            name: 'Cliente',
            phone: '0000000000',
            email: 'cliente@example.com',
          }
        },
        packages: packages.map(pkg => ({
          weight: pkg.weight,
          height: pkg.height,
          width: pkg.width,
          length: pkg.length,
          type: pkg.type || 'box',
          main_weight: pkg.weight,
          volumetric_weight: (pkg.height * pkg.width * pkg.length) / 6000,
          content: pkg.content || 'Electronics',
        })),
        carriers,
        insurance,
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v2/shipments/rate`, requestData, {
          headers: this.getHeaders(),
        })
      );

      this.logger.log(`Received ${response.data.length} shipping rates`);
      
      // Log detallado para debugging
      if (response.data.length === 0) {
        this.logger.warn('No shipping rates received from DrEnvio API');
        this.logger.debug('Request data:', JSON.stringify(requestData, null, 2));
      } else {
        this.logger.log('Shipping rates received:', response.data.map(rate => ({
          carrier: rate.carrier,
          service: rate.service,
          price: rate.price,
          days: rate.days
        })));
      }
      
      return response.data;
    } catch (error) {
      this.logger.error('Error getting shipping rates:', error.response?.data || error.message);
      throw new Error(`Error getting shipping rates: ${error.response?.data?.message || error.message}`);
    }
  }

  // ===== CREAR ENVÍO =====
  async createShipment(shipmentData: DrEnvioCreateShipmentDto): Promise<DrEnvioShipmentResponseDto> {
    try {
      this.logger.log(`Creating shipment with rate_id: ${shipmentData.rate_id}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v2/shipments`, shipmentData, {
          headers: this.getHeaders(),
        })
      );

      this.logger.log(`Shipment created with ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Error creating shipment:', error.response?.data || error.message);
      throw new Error(`Error creating shipment: ${error.response?.data?.message || error.message}`);
    }
  }

  // ===== CONSULTAR ESTADO DEL ENVÍO =====
  async getShipmentStatus(shipmentId: string): Promise<DrEnvioShipmentStatusDto> {
    try {
      this.logger.log(`Getting status for shipment: ${shipmentId}`);

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/shipments/${shipmentId}`, {
          headers: this.getHeaders(),
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error getting shipment status:', error.response?.data || error.message);
      throw new Error(`Error getting shipment status: ${error.response?.data?.message || error.message}`);
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  // Calcular peso volumétrico
  private calculateVolumetricWeight(length: number, width: number, height: number): number {
    return (length * width * height) / 6000;
  }

  // Validar datos de paquete
  private validatePackage(pkg: any): void {
    if (!pkg.weight || pkg.weight <= 0) {
      throw new Error('Weight must be greater than 0');
    }
    if (!pkg.length || !pkg.width || !pkg.height) {
      throw new Error('Package dimensions are required');
    }
  }

  // Seleccionar mejor cotización (más barata)
  selectBestRate(rates: DrEnvioRateResponseDto[]): DrEnvioRateResponseDto | null {
    if (!rates || rates.length === 0) return null;
    
    return rates.reduce((best, current) => 
      current.price < best.price ? current : best
    );
  }

  // Seleccionar cotización por criterio
  selectRateByCriteria(
    rates: DrEnvioRateResponseDto[], 
    criteria: 'cheapest' | 'fastest' | 'carrier'
  ): DrEnvioRateResponseDto | null {
    if (!rates || rates.length === 0) return null;

    switch (criteria) {
      case 'cheapest':
        return this.selectBestRate(rates);
      
      case 'fastest':
        return rates.reduce((fastest, current) => {
          const currentDays = parseInt(current.days.split(' ')[0]);
          const fastestDays = parseInt(fastest.days.split(' ')[0]);
          return currentDays < fastestDays ? current : fastest;
        });
      
      case 'carrier':
        // Buscar FedEx primero, luego Estafeta
        const fedex = rates.find(r => r.carrier === 'fedex');
        if (fedex) return fedex;
        const estafeta = rates.find(r => r.carrier === 'estafeta');
        return estafeta || rates[0];
      
      default:
        return rates[0];
    }
  }

  // Formatear datos para el carrito
  formatRatesForCart(rates: DrEnvioRateResponseDto[]): any[] {
    const timestamp = Date.now();
    return rates.map((rate, index) => ({
      id: this.generateUniqueRateId(rate, index, timestamp),
      originalShippingId: rate.ShippingId, // Mantener el ID original de DrEnvio
      carrier: rate.carrier,
      service: rate.service,
      price: rate.price,
      currency: rate.currency,
      days: rate.days,
      serviceId: rate.service_id,
      metadata: rate.metadata,
    }));
  }

  // Generar ID único para cada tasa de envío
  private generateUniqueRateId(rate: DrEnvioRateResponseDto, index: number, timestamp: number): string {
    // Crear un ID único basado en carrier, service, precio y timestamp
    const carrierCode = rate.carrier.toUpperCase().substring(0, 3);
    const serviceCode = rate.service.replace(/\s+/g, '').substring(0, 6);
    const priceHash = Math.abs(rate.price).toString().replace('.', '');
    
    return `${carrierCode}_${serviceCode}_${priceHash}_${index}_${timestamp}`;
  }
}
