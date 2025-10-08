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
import { CreateShipmentDto } from './dtos/shipping-data.dto';

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
    };
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    retries: number = 3,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      timeout: 60000, // 60 segundos para DrEnvío
    };

    this.logger.debug(`🚚 [DRENVIO] Making ${method} request to: ${url} (attempt ${4 - retries}/3)`);
    console.log(`🚚 [DRENVIO] HTTP ${method} ${url}`, {
      headers: config.headers,
      dataSize: data ? JSON.stringify(data).length : 0,
      attempt: 4 - retries
    });

    try {

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

      this.logger.debug(`🚚 [DRENVIO] Response received from DrEnvío API:`, {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        success: true
      });
      console.log(`🚚 [DRENVIO] API Response:`, {
        status: response.status,
        success: true,
        data: response.data
      });

      return response.data;
    } catch (error) {
      // Errores que no deben reintentarse
      if (error.response) {
        const { status } = error.response;
        if (status === 400 || status === 401 || status === 403 || status === 404) {
          this.logger.error(`🚚 [DRENVIO] Non-retryable error (${status}): ${error.message}`);
          throw this.handleApiError(error, endpoint);
        }
      }

      // Si no hay reintentos disponibles, lanzar error
      if (retries <= 0) {
        this.logger.error(`🚚 [DRENVIO] Max retries exceeded for ${url}`);
        throw this.handleApiError(error, endpoint);
      }

      // Calcular delay exponencial: 1s, 2s, 4s
      const delay = Math.pow(2, 3 - retries) * 1000;
      this.logger.warn(`🚚 [DRENVIO] Retrying request in ${delay}ms (${retries} retries left)`);
      console.log(`🚚 [DRENVIO] Retrying in ${delay}ms... (${retries} retries left)`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reintentar la llamada
      return this.makeRequest(method, endpoint, data, retries - 1);
    }
  }

  private handleApiError(error: any, endpoint: string): BadRequestException {
    this.logger.error(`🚚 [DRENVIO] API error: ${error.message}`, error.stack);
    console.error(`🚚 [DRENVIO] API Error:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: `${this.baseUrl}${endpoint}`
    });
    
    if (error.response) {
      const { status, data } = error.response;
      this.logger.error(`Response status: ${status}`);
      this.logger.error(`Response data:`, JSON.stringify(data, null, 2));
      this.logger.error(`Request URL: ${this.baseUrl}${endpoint}`);
      
      // Manejar diferentes tipos de errores de API
      if (status === 400) {
        return new BadRequestException(`DrEnvío validation error: ${data?.message || data?.error || 'Invalid request data'}`);
      } else if (status === 401) {
        return new BadRequestException('DrEnvío authentication error: Invalid API key');
      } else if (status === 403) {
        return new BadRequestException('DrEnvío authorization error: Access denied');
      } else if (status === 404) {
        return new BadRequestException('DrEnvío endpoint not found');
      } else if (status >= 500) {
        return new BadRequestException(`DrEnvío server error (${status}): Please try again later`);
      } else {
        return new BadRequestException(`DrEnvío API error (${status}): ${data?.message || data?.error || 'Unknown error'}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      return new BadRequestException('DrEnvío API timeout - please try again');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new BadRequestException('DrEnvío API unavailable - please try again later');
    } else if (error.code === 'ETIMEDOUT') {
      return new BadRequestException('DrEnvío API connection timeout');
    } else {
      return new BadRequestException(`DrEnvío API error: ${error.message}`);
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

      const response = await this.makeRequest<any>('POST', '/v2/shipments/rate', requestData);

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

  async generateShipmentWithDrEnvio(
    userId: string,
    createShipmentDto: CreateShipmentDto,
  ): Promise<DrEnvioShipmentResponse> {
    try {
      this.logger.log(`🚚 [DRENVIO] Starting shipment generation for user: ${userId}, order: ${createShipmentDto.orderId}`);
      console.log(`🚚 [DRENVIO] Starting shipment generation for user: ${userId}, order: ${createShipmentDto.orderId}`);

      const { shippingData } = createShipmentDto;
      
      // Validar dimensiones y peso de paquetes
      this.validatePackages(shippingData.packages);
      
      this.logger.log(`🚚 [DRENVIO] Shipping data received:`, {
        carrier: shippingData.shipment.carrier,
        service: shippingData.shipment.service,
        price: shippingData.shipment.price,
        packagesCount: shippingData.packages.length,
        origin: `${shippingData.origin.city}, ${shippingData.origin.state}`,
        destination: `${shippingData.destination.city}, ${shippingData.destination.state}`
      });
      console.log(`🚚 [DRENVIO] Shipping data:`, {
        carrier: shippingData.shipment.carrier,
        service: shippingData.shipment.service,
        price: shippingData.shipment.price,
        packages: shippingData.packages.length
      });

      // Convertir los datos al formato requerido por DrEnvío
      const requestData = {
        origin: {
          name: shippingData.origin.name,
          last_name: shippingData.origin.last_name || 'OPTIONAL LAST NAME',
          company: shippingData.origin.company || 'NA',
          email: shippingData.origin.email,
          phone: shippingData.origin.phone,
          street: shippingData.origin.street,
          number: shippingData.origin.number,
          int_number: shippingData.origin.int_number || '',
          district: shippingData.origin.district,
          city: shippingData.origin.city,
          country: shippingData.origin.country,
          reference: shippingData.origin.reference || 'NA',
          state: shippingData.origin.state,
          postal_code: shippingData.origin.postal_code,
        },
        destination: {
          name: shippingData.destination.name,
          last_name: shippingData.destination.last_name || 'OPTIONAL LAST NAME',
          company: shippingData.destination.company || 'NA',
          email: shippingData.destination.email,
          phone: shippingData.destination.phone,
          street: shippingData.destination.street,
          number: shippingData.destination.number,
          int_number: shippingData.destination.int_number || '',
          district: shippingData.destination.district,
          city: shippingData.destination.city,
          country: shippingData.destination.country,
          reference: shippingData.destination.reference || 'NA',
          state: shippingData.destination.state,
          postal_code: shippingData.destination.postal_code,
        },
        shipment: {
          carrier: shippingData.shipment.carrier,
          ObjectId: shippingData.shipment.ObjectId,
          ShippingId: shippingData.shipment.ShippingId,
          service: shippingData.shipment.service,
          price: shippingData.shipment.price,
          contentExplanation: shippingData.shipment.contentExplanation,
          contentQuantity: shippingData.shipment.contentQuantity,
          satContent: shippingData.shipment.satContent,
        },
        packages: shippingData.packages.map(pkg => ({
          width: pkg.width,
          height: pkg.height,
          length: pkg.length,
          weight: pkg.weight,
          type: pkg.type,
          name: pkg.name,
          content: pkg.content,
          declared_value: pkg.declared_value || 0,
          contentQuantity: pkg.contentQuantity,
        })),
        service_id: shippingData.service_id,
        insurance: shippingData.insurance,
        carriers: shippingData.carriers,
      };

      this.logger.debug(`🚚 [DRENVIO] Sending shipment data to DrEnvío API for order: ${createShipmentDto.orderId}`);
      console.log(`🚚 [DRENVIO] Sending request to DrEnvío API:`, {
        url: `${this.baseUrl}/v2/shipments/generate`,
        orderId: createShipmentDto.orderId,
        carrier: requestData.shipment.carrier,
        service: requestData.shipment.service,
        packages: requestData.packages.length
      });
      
      const response = await this.makeRequest<any>('POST', '/v2/shipments/generate', requestData);

      // Validar respuesta de DrEnvío
      if (!response) {
        throw new BadRequestException('Empty response from DrEnvío API');
      }

      const shipmentId = response.shipmentId || response.id || response.shipment_id;
      const trackingNumber = response.trackingNumber || response.tracking_number || response.tracking;
      
      if (!shipmentId) {
        this.logger.error(`🚚 [DRENVIO] Missing shipment ID in response:`, response);
        throw new BadRequestException('Invalid response from DrEnvío: missing shipment ID');
      }

      if (!trackingNumber) {
        this.logger.warn(`🚚 [DRENVIO] Missing tracking number in response:`, response);
      }

      this.logger.log(`🚚 [DRENVIO] Shipment generated successfully for order: ${createShipmentDto.orderId}`);
      console.log(`🚚 [DRENVIO] Shipment response received:`, {
        orderId: createShipmentDto.orderId,
        shipmentId,
        trackingNumber,
        status: response.status
      });

      return {
        shipmentId,
        trackingNumber: trackingNumber || 'PENDING',
        labelUrl: response.labelUrl || response.label_url || response.label || '',
        status: response.status || 'generated',
        estimatedDeliveryDate: response.estimatedDeliveryDate || response.estimated_delivery_date || response.estimated_delivery || '',
        cost: response.cost || response.price || shippingData.shipment.price,
      };
    } catch (error) {
      this.logger.error(`🚚 [DRENVIO] Error generating shipment for order ${createShipmentDto.orderId}:`, error);
      console.error(`🚚 [DRENVIO] Error generating shipment:`, {
        orderId: createShipmentDto.orderId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async createShipment(request: DrEnvioShipmentRequest): Promise<DrEnvioShipmentResponse> {
    try {
      this.logger.log(`Creating shipment with DrEnvío: ${request.service}`);

      // Validar request
      this.validateShipmentRequest(request);

      const requestData = {
        origin: {
          name: request.origin.name || drenvioConfig.companyInfo.name,
          last_name: 'OPTIONAL LAST NAME',
          company: drenvioConfig.companyInfo.name,
          email: drenvioConfig.companyInfo.contact.email,
          phone: request.origin.phone || drenvioConfig.companyInfo.contact.phone,
          street: request.origin.street,
          number: '123',
          int_number: '2',
          district: request.origin.neighborhood || 'Colonia del Valle',
          city: request.origin.city,
          country: 'MX', // Siempre MX según documentación
          reference: 'Centro de distribución',
          state: request.origin.state,
          postal_code: request.origin.postalCode,
        },
        destination: {
          name: request.destination.name || 'Cliente',
          last_name: 'OPTIONAL LAST NAME',
          company: request.destination.name || 'Cliente',
          email: 'cliente@example.com',
          phone: request.destination.phone || '0000000000',
          street: request.destination.street,
          number: '456',
          int_number: '',
          district: request.destination.neighborhood || 'Roma Norte',
          city: request.destination.city,
          country: 'MX', // Siempre MX según documentación
          reference: 'Dirección de envío',
          state: request.destination.state,
          postal_code: request.destination.postalCode,
        },
        shipment: {
          carrier: request.service.split('_')[0] || 'fedex', // Extraer carrier del serviceId
          ObjectId: 'code',
          ShippingId: request.service, // Usar el serviceId completo como ShippingId
          service: request.service.split('_')[2] || 'ground', // Extraer service del serviceId
          price: request.totalValue * 0.1, // Calcular precio basado en valor
          contentExplanation: request.items.map(item => item.name).join(', '),
          contentQuantity: request.items.reduce((total, item) => total + item.quantity, 0),
          satContent: '31181701',
        },
        packages: [
          {
            width: request.dimensions.width,
            height: request.dimensions.height,
            length: request.dimensions.length,
            weight: request.dimensions.weight,
            type: 'box',
            name: 'Paquete de envío',
            content: 'ORNAMENTOS O DECORACIONES',
            declared_value: request.totalValue,
            contentQuantity: request.items.reduce((total, item) => total + item.quantity, 0),
          }
        ],
        service_id: request.service, // CRÍTICO: Usar el serviceId real de la tarifa seleccionada
        insurance: request.insured ? 100 : 0,
        carriers: [request.service.split('_')[0] || 'fedex'], // Usar el carrier del serviceId
      };

      // Logs reducidos para evitar spam en consola
      this.logger.debug(`Creating shipment: ${request.service} to ${request.destination.city}`);
      
      const response = await this.makeRequest<any>('POST', '/v2/shipments/generate', requestData);

      this.logger.debug(`Shipment response received`);

      return {
        shipmentId: response.shipmentId || response.id,
        trackingNumber: response.trackingNumber || response.tracking_number,
        labelUrl: response.labelUrl || response.label_url,
        status: response.status,
        estimatedDeliveryDate: response.estimatedDeliveryDate || response.estimated_delivery_date,
        cost: response.cost || response.price,
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
        `/v2/tracking/${trackingNumber}`
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

  // ===== MÉTODO DE PRUEBA =====

  async testHardcodedShipment(): Promise<any> {
    try {
      this.logger.log('🧪 [TEST] Starting hardcoded DrEnvío shipment test');
      console.log('🧪 [TEST] Testing DrEnvío API with hardcoded data...');

      // Datos hardcodeados para prueba
      const testShipmentData = {
        origin: {
          name: 'Nabra Store',
          last_name: 'XR',
          company: 'Nabra',
          email: 'contact@nabraxr.com',
          phone: '+525512345678',
          street: 'Callejón 6 de Mayo',
          number: '150',
          int_number: '',
          district: 'Centro',
          city: 'Tlajomulco de Zúñiga',
          country: 'MX',
          reference: 'Almacén Nabra',
          state: 'JAL',
          postal_code: '45646',
        },
        destination: {
          name: 'Juan Pérez',
          last_name: 'García',
          company: 'NA',
          email: 'cliente@example.com',
          phone: '+525598765432',
          street: 'Av. Revolución',
          number: '234',
          int_number: 'Depto 5B',
          district: 'San Ángel',
          city: 'Ciudad de México',
          country: 'MX',
          reference: 'Edificio azul, portón negro',
          state: 'CDMX',
          postal_code: '01000',
        },
        shipment: {
          carrier: 'fedex',
          ObjectId: 'code',
          ShippingId: 'fedex_mx_ground',
          service: 'ground',
          price: 250,
          contentExplanation: 'Productos de realidad virtual',
          contentQuantity: 2,
          satContent: '31181701', // Código SAT para accesorios electrónicos
        },
        packages: [
          {
            width: 30,
            height: 20,
            length: 40,
            weight: 2.5,
            type: 'box',
            name: 'Paquete de prueba',
            content: 'ORNAMENTOS O DECORACIONES',
            declared_value: 1500,
            contentQuantity: 2,
          }
        ],
        service_id: 'fedex_mx_ground',
        insurance: 0,
        carriers: ['fedex'],
      };

      this.logger.log('🧪 [TEST] Test data prepared:', {
        origin: `${testShipmentData.origin.city}, ${testShipmentData.origin.state}`,
        destination: `${testShipmentData.destination.city}, ${testShipmentData.destination.state}`,
        carrier: testShipmentData.shipment.carrier,
        service: testShipmentData.shipment.service,
        packages: testShipmentData.packages.length,
      });

      console.log('🧪 [TEST] Sending test request to DrEnvío API...');
      console.log('🧪 [TEST] API URL:', `${this.baseUrl}/v2/shipments/generate`);

      // Hacer la llamada a DrEnvío
      const response = await this.makeRequest<any>(
        'POST',
        '/v2/shipments/generate',
        testShipmentData
      );

      this.logger.log('🧪 [TEST] DrEnvío response received successfully');
      console.log('🧪 [TEST] Response:', {
        shipmentId: response.shipmentId || response.id,
        trackingNumber: response.trackingNumber || response.tracking_number,
        status: response.status,
        labelUrl: response.labelUrl || response.label_url,
      });

      return {
        success: true,
        message: 'Test shipment created successfully',
        request: testShipmentData,
        response: {
          shipmentId: response.shipmentId || response.id,
          trackingNumber: response.trackingNumber || response.tracking_number,
          labelUrl: response.labelUrl || response.label_url,
          status: response.status,
          estimatedDeliveryDate: response.estimatedDeliveryDate || response.estimated_delivery_date,
          cost: response.cost || response.price,
          fullResponse: response,
        },
      };
    } catch (error) {
      this.logger.error('🧪 [TEST] Error in hardcoded shipment test:', error);
      console.error('🧪 [TEST] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      return {
        success: false,
        message: 'Test shipment failed',
        error: error.message,
        errorDetails: error.response?.data || error,
      };
    }
  }

  // ===== ESTADO DEL SERVICIO =====

  async getServiceStatus(): Promise<any> {
    try {
      return {
        status: 'operational',
        apiUrl: this.baseUrl,
        environment: drenvioConfig.environment,
        hasApiKey: !!this.apiKey,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ===== VALIDAR PAQUETES =====

  private validatePackages(packages: any[]): void {
    if (!packages || packages.length === 0) {
      throw new BadRequestException('At least one package is required');
    }

    packages.forEach((pkg, index) => {
      if (!pkg.width || !pkg.height || !pkg.length || !pkg.weight) {
        throw new BadRequestException(`Package ${index + 1} is missing required dimensions`);
      }

      if (pkg.weight > drenvioConfig.limits.maxPackageWeight) {
        throw new BadRequestException(`Package ${index + 1} exceeds maximum weight: ${drenvioConfig.limits.maxPackageWeight}kg`);
      }

      if (pkg.length > drenvioConfig.limits.maxDimension || 
          pkg.width > drenvioConfig.limits.maxDimension || 
          pkg.height > drenvioConfig.limits.maxDimension) {
        throw new BadRequestException(`Package ${index + 1} exceeds maximum dimensions: ${drenvioConfig.limits.maxDimension}cm`);
      }
    });
  }
}
