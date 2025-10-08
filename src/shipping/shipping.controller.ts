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
  Logger,
} from '@nestjs/common';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { TrackingService } from './tracking.service';
import { DrEnvioService } from './drenvio.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShippingDataCaptureDto, ShippingCalculationResponseDto, CreateShipmentDto } from './dtos/shipping-data.dto';

@ApiTags('Shipping')
@ApiBearerAuth('bearer')
@Controller('shipping')
export class ShippingController {
  private readonly logger = new Logger(ShippingController.name);

  constructor(
    private shippingCalculatorService: ShippingCalculatorService,
    private trackingService: TrackingService,
    private drenvioService: DrEnvioService,
  ) {}

  // ===== CÁLCULO DE ENVÍOS =====

  @ApiOperation({ summary: 'Calcular envío (manual)', description: 'Calcula tarifas de envío a partir de items y dirección.' })
  @ApiBody({ schema: { type: 'object' } })
  @Post('calculate')
  async calculateShipping(@Request() req, @Body() calculateRequest: any) {
    return this.shippingCalculatorService.calculateShipping({
      userId: req.user.userId,
      addressId: calculateRequest.addressId,
      cartItems: calculateRequest.cartItems,
      customItems: calculateRequest.customItems,
    });
  }

  @ApiOperation({ summary: 'Capturar datos de envío y calcular total', description: 'Captura información de envío y calcula precio total (carrito + envío).' })
  @ApiBody({ type: ShippingDataCaptureDto })
  @Post('capture-and-calculate')
  async captureShippingDataAndCalculate(
    @Request() req,
    @Body() shippingData: ShippingDataCaptureDto,
  ): Promise<ShippingCalculationResponseDto> {
    return this.shippingCalculatorService.captureShippingDataAndCalculate(
      req.user.userId,
      shippingData,
    );
  }

  @ApiOperation({ summary: 'Calcular envío desde carrito', description: 'Calcula tarifas usando los items del carrito.' })
  @ApiQuery({ name: 'addressId', required: false })
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

  @ApiOperation({ summary: 'Obtener zona por CP', description: 'Mapea un código postal a zona, tarifas base y servicios disponibles.' })
  @ApiParam({ name: 'postalCode', description: 'Código postal' })
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
  @ApiOperation({ summary: 'Tracking público', description: 'Consulta el tracking por número de seguimiento.' })
  @ApiParam({ name: 'trackingNumber', description: 'Código de seguimiento' })
  @Get('track/:trackingNumber')
  async trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getTrackingInfo(trackingNumber);
  }

  @ApiOperation({ summary: 'Tracking por orden', description: 'Consulta el tracking asociado a una orden del usuario.' })
  @ApiParam({ name: 'orderId', description: 'ID de la orden' })
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

  @ApiOperation({ summary: 'Mis envíos', description: 'Listado de envíos del usuario con paginación.' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
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

  @ApiOperation({ summary: 'Validar dirección', description: 'Valida un objeto de dirección contra el proveedor de envíos.' })
  @ApiBody({ schema: { type: 'object' } })
  @Post('validate-address')
  async validateAddress(@Body() address: any) {
    return this.drenvioService.validateAddress(address);
  }

  @ApiOperation({ summary: 'Estimación de entrega', description: 'Calcula una fecha estimada de entrega por servicio y zona.' })
  @ApiQuery({ name: 'service', required: true })
  @ApiQuery({ name: 'zone', required: true })
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

  @ApiOperation({ summary: 'Servicios disponibles', description: 'Lista de servicios de envío y sus características.' })
  @ApiQuery({ name: 'zone', required: false })
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

  @ApiOperation({ summary: 'Cobertura', description: 'Zonas de cobertura, rangos de CP y tiempos estimados.' })
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
  @ApiOperation({ summary: 'Estadísticas de envíos (admin)', description: 'Métricas de envíos en un rango de fechas.' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
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
  @ApiOperation({ summary: 'Performance de entregas (admin)', description: 'Indicadores de performance en rango de fechas.' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
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
  @ApiOperation({ summary: 'Forzar actualización de tracking (admin)', description: 'Dispara actualización de todos los envíos activos.' })
  @Post('admin/update-tracking')
  @HttpCode(HttpStatus.OK)
  async forceTrackingUpdate() {
    await this.trackingService.updateAllActiveShipments();
    return { message: 'Tracking update initiated' };
  }

  // ===== ESTADO DEL SERVICIO =====

  @ApiOperation({ summary: 'Estado del servicio DrEnvío', description: 'Verifica el estado del servicio DrEnvío y circuit breaker.' })
  @Get('status')
  async getServiceStatus() {
    return this.drenvioService.getServiceStatus();
  }

  // ===== PRUEBA HARDCODEADA DE DRENVÍO =====

  @Public()
  @ApiOperation({ summary: 'Prueba hardcodeada de DrEnvío', description: 'Prueba la API de DrEnvío con datos reales hardcodeados.' })
  @Post('test-drenvio-hardcoded')
  async testDrenvioHardcoded() {
    return this.drenvioService.testHardcodedShipment();
  }

  // ===== GENERACIÓN DE ENVÍOS =====

  @Public()
  @ApiOperation({ summary: 'Generar envío con DrEnvío', description: 'Genera envío con DrEnvío después del pago exitoso.' })
  @ApiBody({ type: CreateShipmentDto })
  @Post('generate-shipment')
  async generateShipment(
    @Request() req,
    @Body() createShipmentDto: CreateShipmentDto,
  ) {
    // Validar que el orderId sea un ObjectId válido
    if (!createShipmentDto.orderId || createShipmentDto.orderId.length !== 24) {
      throw new BadRequestException('Invalid order ID format');
    }

    // Validar que shippingData esté presente
    if (!createShipmentDto.shippingData) {
      throw new BadRequestException('Shipping data is required');
    }

    // Validar campos críticos de shippingData
    const { shippingData } = createShipmentDto;
    if (!shippingData.origin || !shippingData.destination || !shippingData.shipment || !shippingData.packages) {
      throw new BadRequestException('Missing required shipping data fields');
    }

    if (!shippingData.packages.length) {
      throw new BadRequestException('At least one package is required');
    }

    // userId opcional ya que la ruta es pública
    const userId = req.user?.userId || null;

    return this.drenvioService.generateShipmentWithDrEnvio(
      userId,
      createShipmentDto,
    );
  }

  // ===== WEBHOOKS DRENVÍO =====

  @Public()
  @ApiOperation({ summary: 'Webhook: actualización de estado', description: 'Webhook de DrEnvío para cambios de estado.' })
  @Post('webhooks/status-update')
  @HttpCode(HttpStatus.OK)
  async handleStatusUpdate(@Body() webhookData: any) {
    // TODO: Validar webhook signature
    this.logger.debug('DrEnvío webhook received:', webhookData);
    
    // Procesar actualización de estado
    // Este endpoint será llamado por DrEnvío cuando cambie el estado del envío
    
    return { status: 'received' };
  }

  @Public()
  @ApiOperation({ summary: 'Webhook: entregado', description: 'Notificación cuando un envío fue entregado.' })
  @Post('webhooks/delivered')
  @HttpCode(HttpStatus.OK)
  async handleDelivered(@Body() webhookData: any) {
    this.logger.debug('DrEnvío delivery webhook received:', webhookData);
    return { status: 'received' };
  }

  @Public()
  @ApiOperation({ summary: 'Webhook: excepción', description: 'Notificación cuando un envío presenta una excepción.' })
  @Post('webhooks/exception')
  @HttpCode(HttpStatus.OK)
  async handleException(@Body() webhookData: any) {
    this.logger.debug('DrEnvío exception webhook received:', webhookData);
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
