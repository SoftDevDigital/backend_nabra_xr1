import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { TrackingService } from './tracking.service';
import { DrEnvioService } from './drenvio.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('shipping')
export class ShippingController {
  constructor(
    private shippingCalculatorService: ShippingCalculatorService,
    private trackingService: TrackingService,
    private drenvioService: DrEnvioService,
  ) {}

  // ===== CÁLCULO DE ENVÍOS =====

  @Post('calculate')
  async calculateShipping(@Request() req, @Body() calculateRequest: any) {
    return this.shippingCalculatorService.calculateShipping({
      userId: req.user.userId,
      addressId: calculateRequest.addressId,
      cartItems: calculateRequest.cartItems,
      customItems: calculateRequest.customItems,
    });
  }

  @Post('calculate/cart')
  async calculateShippingFromCart(
    @Request() req,
    @Query('addressId') addressId?: string,
  ) {
    return this.shippingCalculatorService.calculateShippingFromCart(
      req.user.userId,
      addressId,
    );
  }

  @Get('zones/:postalCode')
  async getZoneInfo(@Param('postalCode') postalCode: string) {
    // Lógica para obtener información de zona basada en código postal
    const zone = this.getZoneByPostalCode(postalCode);
    
    return {
      postalCode,
      zone,
      zoneName: this.getZoneName(zone),
      baseRate: this.getZoneBaseRate(zone),
      freeShippingThreshold: this.getFreeShippingThreshold(zone),
      estimatedDelivery: this.getZoneEstimatedDelivery(zone),
      availableServices: this.getAvailableServices(zone),
    };
  }

  // ===== TRACKING PÚBLICO =====

  @Public()
  @Get('track/:trackingNumber')
  async trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getTrackingInfo(trackingNumber);
  }

  @Get('track/order/:orderId')
  async trackShipmentByOrder(@Request() req, @Param('orderId') orderId: string) {
    const trackingInfo = await this.trackingService.getTrackingInfoByOrderId(
      orderId,
      req.user.userId,
    );

    if (!trackingInfo) {
      throw new NotFoundException('No tracking information found for this order');
    }

    return trackingInfo;
  }

  @Get('my-shipments')
  async getUserShipments(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const limitNum = limit ? parseInt(limit.toString(), 10) : 10;
    const offsetNum = offset ? parseInt(offset.toString(), 10) : 0;

    if (limitNum < 1 || limitNum > 50) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }

    return this.trackingService.getUserShipments(req.user.userId, limitNum, offsetNum);
  }

  // ===== VALIDACIÓN DE DIRECCIONES =====

  @Post('validate-address')
  async validateAddress(@Body() address: any) {
    return this.drenvioService.validateAddress(address);
  }

  @Get('delivery-estimate')
  async getDeliveryEstimate(
    @Query('service') service: string,
    @Query('zone') zone: string,
  ) {
    if (!service || !zone) {
      throw new BadRequestException('Service and zone are required');
    }

    const estimatedDate = await this.shippingCalculatorService.getEstimatedDeliveryDate(
      service,
      zone,
    );

    return {
      service,
      zone,
      estimatedDeliveryDate: estimatedDate,
    };
  }

  // ===== INFORMACIÓN DE SERVICIOS =====

  @Get('services')
  async getAvailableShippingServices(@Query('zone') zone?: string) {
    const services = [
      {
        id: 'standard',
        name: 'Envío Estándar',
        description: 'Entrega en 3-5 días hábiles',
        features: ['Seguimiento incluido', 'Entrega en domicilio'],
        maxWeight: 30,
        maxDimensions: { length: 100, width: 100, height: 100 },
        availableIn: ['CABA', 'GBA', 'INTERIOR'],
      },
      {
        id: 'express',
        name: 'Envío Express',
        description: 'Entrega en 24-48 horas',
        features: ['Seguimiento incluido', 'Entrega en domicilio', 'Entrega rápida'],
        maxWeight: 20,
        maxDimensions: { length: 80, width: 80, height: 80 },
        availableIn: ['CABA', 'GBA', 'INTERIOR'],
      },
      {
        id: 'same_day',
        name: 'Envío Mismo Día',
        description: 'Entrega el mismo día',
        features: ['Seguimiento incluido', 'Entrega en domicilio', 'Entrega el mismo día'],
        maxWeight: 10,
        maxDimensions: { length: 50, width: 50, height: 50 },
        availableIn: ['CABA'],
      },
    ];

    if (zone) {
      return services.filter(service => service.availableIn.includes(zone.toUpperCase()));
    }

    return services;
  }

  @Get('coverage')
  async getCoverageInfo() {
    return {
      zones: [
        {
          id: 'CABA',
          name: 'Ciudad Autónoma de Buenos Aires',
          postalCodeRange: '1000-1499',
          estimatedDelivery: '1-2 días hábiles',
          services: ['standard', 'express', 'same_day'],
        },
        {
          id: 'GBA',
          name: 'Gran Buenos Aires',
          postalCodeRange: '1600-1900',
          estimatedDelivery: '2-3 días hábiles',
          services: ['standard', 'express'],
        },
        {
          id: 'INTERIOR',
          name: 'Interior del País',
          postalCodeRange: 'Resto del país',
          estimatedDelivery: '3-7 días hábiles',
          services: ['standard', 'express'],
        },
      ],
    };
  }

  // ===== ENDPOINTS ADMINISTRATIVOS =====

  @Roles('admin')
  @Get('admin/statistics')
  async getShipmentStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    return this.trackingService.getShipmentStatistics(from, to);
  }

  @Roles('admin')
  @Get('admin/performance')
  async getDeliveryPerformance(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    return this.trackingService.getDeliveryPerformance(from, to);
  }

  @Roles('admin')
  @Post('admin/update-tracking')
  @HttpCode(HttpStatus.OK)
  async forceTrackingUpdate() {
    await this.trackingService.updateAllActiveShipments();
    return { message: 'Tracking update initiated' };
  }

  // ===== WEBHOOKS DRENVÍO =====

  @Public()
  @Post('webhooks/status-update')
  @HttpCode(HttpStatus.OK)
  async handleStatusUpdate(@Body() webhookData: any) {
    // TODO: Validar webhook signature
    console.log('DrEnvío webhook received:', webhookData);
    
    // Procesar actualización de estado
    // Este endpoint será llamado por DrEnvío cuando cambie el estado del envío
    
    return { status: 'received' };
  }

  @Public()
  @Post('webhooks/delivered')
  @HttpCode(HttpStatus.OK)
  async handleDelivered(@Body() webhookData: any) {
    console.log('DrEnvío delivery webhook received:', webhookData);
    return { status: 'received' };
  }

  @Public()
  @Post('webhooks/exception')
  @HttpCode(HttpStatus.OK)
  async handleException(@Body() webhookData: any) {
    console.log('DrEnvío exception webhook received:', webhookData);
    return { status: 'received' };
  }

  // ===== MÉTODOS AUXILIARES =====

  private getZoneByPostalCode(postalCode: string): string {
    const code = postalCode.replace(/\D/g, '');
    
    if (code >= '1000' && code <= '1499') return 'CABA';
    if (code >= '1600' && code <= '1900') return 'GBA';
    return 'INTERIOR';
  }

  private getZoneName(zone: string): string {
    const names = {
      CABA: 'Ciudad Autónoma de Buenos Aires',
      GBA: 'Gran Buenos Aires',
      INTERIOR: 'Interior del País',
    };
    return names[zone] || 'Zona desconocida';
  }

  private getZoneBaseRate(zone: string): number {
    const rates = {
      CABA: 1500,
      GBA: 2500,
      INTERIOR: 3500,
    };
    return rates[zone] || 3500;
  }

  private getFreeShippingThreshold(zone: string): number {
    const thresholds = {
      CABA: 15000,
      GBA: 20000,
      INTERIOR: 25000,
    };
    return thresholds[zone] || 25000;
  }

  private getZoneEstimatedDelivery(zone: string): string {
    const estimates = {
      CABA: '1-2 días hábiles',
      GBA: '2-3 días hábiles',
      INTERIOR: '3-7 días hábiles',
    };
    return estimates[zone] || '3-7 días hábiles';
  }

  private getAvailableServices(zone: string): string[] {
    const services = {
      CABA: ['standard', 'express', 'same_day'],
      GBA: ['standard', 'express'],
      INTERIOR: ['standard', 'express'],
    };
    return services[zone] || ['standard'];
  }
}
