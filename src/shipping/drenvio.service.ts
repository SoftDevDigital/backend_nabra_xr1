import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { drenvioConfig } from '../config/drenvio.config';
import { ShipmentDimensions, ShipmentAddress, ShipmentItem } from './schemas/shipment.schema';

export interface DrEnvioShippingQuote {
  serviceId: string;
  serviceName: string;
  cost: number;
  estimatedDays: number;
  estimatedDeliveryDate: string;
  carrier: string;
  zone: string;
  restrictions?: string[];
}

export interface DrEnvioShipmentRequest {
  service: string;
  origin: ShipmentAddress;
  destination: ShipmentAddress;
  dimensions: ShipmentDimensions;
  items: ShipmentItem[];
  totalValue: number;
  requiresSignature?: boolean;
  fragile?: boolean;
  insured?: boolean;
  specialInstructions?: string;
}

export interface DrEnvioShipmentResponse {
  shipmentId: string;
  trackingNumber: string;
  labelUrl: string;
  status: string;
  estimatedDeliveryDate: string;
  cost: number;
}

export interface DrEnvioTrackingResponse {
  trackingNumber: string;
  status: string;
  statusDescription: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  events: Array<{
    timestamp: string;
    status: string;
    description: string;
    location?: string;
    courier?: string;
  }>;
}

@Injectable()
export class DrEnvioService {
  private readonly logger = new Logger(DrEnvioService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = drenvioConfig.apiUrl;
    this.apiKey = drenvioConfig.apiKey;
    this.secretKey = drenvioConfig.secretKey;
  }

  // ===== AUTENTICACIÓN Y HEADERS =====

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-API-Version': 'v1',
      'X-Client-Name': 'Nabra XR',
    };
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        headers: this.getHeaders(),
        timeout: 30000,
      };

      let response;
      switch (method) {
        case 'GET':
          response = await firstValueFrom(this.httpService.get(url, config));
          break;
        case 'POST':
          response = await firstValueFrom(this.httpService.post(url, data, config));
          break;
        case 'PUT':
          response = await firstValueFrom(this.httpService.put(url, data, config));
          break;
        case 'DELETE':
          response = await firstValueFrom(this.httpService.delete(url, config));
          break;
      }

      return response.data;
    } catch (error) {
      this.logger.error(`DrEnvío API error: ${error.message}`, error.stack);
      
      if (error.response) {
        const { status, data } = error.response;
        throw new BadRequestException(
          `DrEnvío API error (${status}): ${data.message || error.message}`
        );
      }
      
      throw new InternalServerErrorException('DrEnvío service unavailable');
    }
  }

  // ===== COTIZACIÓN DE ENVÍOS =====

  async getShippingQuotes(
    origin: ShipmentAddress,
    destination: ShipmentAddress,
    dimensions: ShipmentDimensions,
    totalValue: number,
  ): Promise<DrEnvioShippingQuote[]> {
    try {
      this.logger.log('Getting shipping quotes from DrEnvío');

      // Validar dimensiones y peso
      this.validatePackageDimensions(dimensions);

      const requestData = {
        origin: {
          postalCode: origin.postalCode,
          city: origin.city,
          state: origin.state,
          country: origin.country,
        },
        destination: {
          postalCode: destination.postalCode,
          city: destination.city,
          state: destination.state,
          country: destination.country,
        },
        package: {
          weight: dimensions.weight,
          length: dimensions.length,
          width: dimensions.width,
          height: dimensions.height,
          declaredValue: totalValue,
        },
        services: Object.keys(drenvioConfig.services),
      };

      const response = await this.makeRequest<any>('POST', '/shipping/quotes', requestData);

      return this.processQuotesResponse(response, destination);
    } catch (error) {
      this.logger.error('Error getting shipping quotes:', error);
      
      // Fallback a cotizaciones locales si DrEnvío no está disponible
      return this.getFallbackQuotes(destination, dimensions, totalValue);
    }
  }

  private processQuotesResponse(response: any, destination: ShipmentAddress): DrEnvioShippingQuote[] {
    if (!response.quotes || !Array.isArray(response.quotes)) {
      throw new BadRequestException('Invalid response from DrEnvío');
    }

    return response.quotes.map((quote: any) => ({
      serviceId: quote.serviceId,
      serviceName: quote.serviceName,
      cost: Math.round(quote.cost * 100) / 100, // Redondear a 2 decimales
      estimatedDays: quote.estimatedDays,
      estimatedDeliveryDate: quote.estimatedDeliveryDate,
      carrier: quote.carrier || 'DrEnvío',
      zone: this.getZoneByPostalCode(destination.postalCode),
      restrictions: quote.restrictions || [],
    }));
  }

  private getFallbackQuotes(
    destination: ShipmentAddress,
    dimensions: ShipmentDimensions,
    totalValue: number,
  ): DrEnvioShippingQuote[] {
    this.logger.warn('Using fallback shipping quotes');

    const zone = this.getZoneByPostalCode(destination.postalCode);
    const zoneConfig = this.getZoneConfig(zone);
    const weightMultiplier = Math.max(1, Math.ceil(dimensions.weight / 5));
    
    const quotes: DrEnvioShippingQuote[] = [];

    // Envío estándar
    quotes.push({
      serviceId: 'standard',
      serviceName: 'Envío Estándar',
      cost: zoneConfig.baseRate * weightMultiplier,
      estimatedDays: this.getEstimatedDays(zone, 'standard'),
      estimatedDeliveryDate: this.calculateDeliveryDate(this.getEstimatedDays(zone, 'standard')),
      carrier: 'DrEnvío',
      zone,
    });

    // Envío express (solo si cumple restricciones)
    if (dimensions.weight <= drenvioConfig.services.expressDelivery.maxWeight) {
      quotes.push({
        serviceId: 'express',
        serviceName: 'Envío Express',
        cost: zoneConfig.baseRate * weightMultiplier * 1.5,
        estimatedDays: this.getEstimatedDays(zone, 'express'),
        estimatedDeliveryDate: this.calculateDeliveryDate(this.getEstimatedDays(zone, 'express')),
        carrier: 'DrEnvío',
        zone,
      });
    }

    // Mismo día (solo CABA)
    if (zone === 'CABA' && dimensions.weight <= drenvioConfig.services.sameDay.maxWeight) {
      quotes.push({
        serviceId: 'same_day',
        serviceName: 'Envío Mismo Día',
        cost: zoneConfig.baseRate * weightMultiplier * 2,
        estimatedDays: 0,
        estimatedDeliveryDate: new Date().toISOString().split('T')[0],
        carrier: 'DrEnvío',
        zone,
      });
    }

    return quotes;
  }

  // ===== CREACIÓN DE ENVÍOS =====

  async createShipment(request: DrEnvioShipmentRequest): Promise<DrEnvioShipmentResponse> {
    try {
      this.logger.log(`Creating shipment with DrEnvío: ${request.service}`);

      // Validar request
      this.validateShipmentRequest(request);

      const requestData = {
        service: request.service,
        origin: this.formatAddress(request.origin),
        destination: this.formatAddress(request.destination),
        package: {
          weight: request.dimensions.weight,
          length: request.dimensions.length,
          width: request.dimensions.width,
          height: request.dimensions.height,
          declaredValue: request.totalValue,
        },
        items: request.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          value: item.value,
          sku: item.sku,
          description: item.description,
        })),
        options: {
          requiresSignature: request.requiresSignature || false,
          fragile: request.fragile || false,
          insured: request.insured || false,
          specialInstructions: request.specialInstructions,
        },
        webhookUrl: `${drenvioConfig.webhooks.baseUrl}${drenvioConfig.webhooks.endpoints.statusUpdate}`,
      };

      const response = await this.makeRequest<any>('POST', '/shipments', requestData);

      return {
        shipmentId: response.shipmentId,
        trackingNumber: response.trackingNumber,
        labelUrl: response.labelUrl,
        status: response.status,
        estimatedDeliveryDate: response.estimatedDeliveryDate,
        cost: response.cost,
      };
    } catch (error) {
      this.logger.error('Error creating shipment:', error);
      throw error;
    }
  }

  // ===== TRACKING =====

  async getTrackingInfo(trackingNumber: string): Promise<DrEnvioTrackingResponse> {
    try {
      this.logger.log(`Getting tracking info for: ${trackingNumber}`);

      const response = await this.makeRequest<any>(
        'GET',
        `/tracking/${trackingNumber}`
      );

      return {
        trackingNumber: response.trackingNumber,
        status: response.status,
        statusDescription: response.statusDescription,
        estimatedDeliveryDate: response.estimatedDeliveryDate,
        actualDeliveryDate: response.actualDeliveryDate,
        events: response.events.map((event: any) => ({
          timestamp: event.timestamp,
          status: event.status,
          description: event.description,
          location: event.location,
          courier: event.courier,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting tracking info for ${trackingNumber}:`, error);
      throw error;
    }
  }

  // ===== CANCELACIÓN =====

  async cancelShipment(shipmentId: string, reason?: string): Promise<boolean> {
    try {
      this.logger.log(`Cancelling shipment: ${shipmentId}`);

      await this.makeRequest('DELETE', `/shipments/${shipmentId}`, {
        reason: reason || 'Cancelled by customer',
      });

      return true;
    } catch (error) {
      this.logger.error(`Error cancelling shipment ${shipmentId}:`, error);
      return false;
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private validatePackageDimensions(dimensions: ShipmentDimensions): void {
    const { weight, length, width, height } = dimensions;
    const { limits } = drenvioConfig;

    if (weight > limits.maxPackageWeight) {
      throw new BadRequestException(`Package weight exceeds maximum: ${limits.maxPackageWeight}kg`);
    }

    if (length > limits.maxDimension || width > limits.maxDimension || height > limits.maxDimension) {
      throw new BadRequestException(`Package dimensions exceed maximum: ${limits.maxDimension}cm`);
    }

    if (length < limits.minDimension || width < limits.minDimension || height < limits.minDimension) {
      throw new BadRequestException(`Package dimensions below minimum: ${limits.minDimension}cm`);
    }
  }

  private validateShipmentRequest(request: DrEnvioShipmentRequest): void {
    if (!request.service || !request.origin || !request.destination) {
      throw new BadRequestException('Missing required shipment data');
    }

    if (!request.items || request.items.length === 0) {
      throw new BadRequestException('Shipment must contain at least one item');
    }

    if (request.totalValue > drenvioConfig.limits.maxPackageValue) {
      throw new BadRequestException(`Package value exceeds maximum: $${drenvioConfig.limits.maxPackageValue}`);
    }

    this.validatePackageDimensions(request.dimensions);
  }

  private formatAddress(address: ShipmentAddress): any {
    return {
      name: address.name,
      phone: address.phone,
      street: address.street,
      apartment: address.apartment,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      references: address.references,
      coordinates: address.coordinates,
    };
  }

  private getZoneByPostalCode(postalCode: string): string {
    const code = postalCode.replace(/\D/g, '');
    
    // CABA: 1000-1499
    if (code >= '1000' && code <= '1499') {
      return 'CABA';
    }
    
    // GBA: 1600-1900
    if (code >= '1600' && code <= '1900') {
      return 'GBA';
    }
    
    // Interior
    return 'INTERIOR';
  }

  private getZoneConfig(zone: string) {
    return drenvioConfig.deliveryZones[zone.toLowerCase()] || drenvioConfig.deliveryZones.interior;
  }

  private getEstimatedDays(zone: string, service: string): number {
    const baseDays = {
      CABA: { standard: 2, express: 1, same_day: 0 },
      GBA: { standard: 3, express: 2, same_day: 0 },
      INTERIOR: { standard: 5, express: 3, same_day: 0 },
    };

    return baseDays[zone]?.[service] || 5;
  }

  private calculateDeliveryDate(estimatedDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + estimatedDays);
    
    // Saltar fines de semana
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    
    return date.toISOString().split('T')[0];
  }

  // ===== VALIDACIÓN DE DIRECCIONES =====

  async validateAddress(address: ShipmentAddress): Promise<{
    valid: boolean;
    normalized?: ShipmentAddress;
    suggestions?: ShipmentAddress[];
    zone?: string;
  }> {
    try {
      const response = await this.makeRequest<any>('POST', '/addresses/validate', {
        address: this.formatAddress(address),
      });

      return {
        valid: response.valid,
        normalized: response.normalized,
        suggestions: response.suggestions || [],
        zone: this.getZoneByPostalCode(address.postalCode),
      };
    } catch (error) {
      this.logger.error('Error validating address:', error);
      
      // Fallback: validación básica local
      return {
        valid: !!(address.street && address.city && address.postalCode),
        zone: this.getZoneByPostalCode(address.postalCode),
      };
    }
  }
}
