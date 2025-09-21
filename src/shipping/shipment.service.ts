import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipment, ShipmentStatus, ShipmentService as ShipmentServiceType } from './schemas/shipment.schema';
import { DrEnvioService, DrEnvioShipmentRequest } from './drenvio.service';
import { TrackingService } from './tracking.service';
import { OrdersService } from '../orders/orders.service';
import { ProfileService } from '../users/profile.service';
import { ProductsService } from '../products/products.service';

export interface CreateShipmentRequest {
  orderId: string;
  userId: string;
  service: ShipmentServiceType;
  addressId?: string; // Si no se proporciona, usa la dirección por defecto
  requiresSignature?: boolean;
  fragile?: boolean;
  insured?: boolean;
  specialInstructions?: string;
}

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    private drenvioService: DrEnvioService,
    @Inject(forwardRef(() => TrackingService)) private trackingService: TrackingService,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    @Inject(forwardRef(() => ProfileService)) private profileService: ProfileService,
    @Inject(forwardRef(() => ProductsService)) private productsService: ProductsService,
  ) {}

  // ===== CREACIÓN DE ENVÍOS =====

  async createShipment(request: CreateShipmentRequest): Promise<Shipment> {
    try {
      this.logger.log(`Creating shipment for order: ${request.orderId}`);

      // 1. Validar y obtener la orden
      const order = await this.ordersService.getUserOrderById(request.userId, request.orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // 2. Verificar que no exista un envío para esta orden
      const existingShipment = await this.shipmentModel.findOne({ orderId: request.orderId });
      if (existingShipment) {
        throw new BadRequestException('Shipment already exists for this order');
      }

      // 3. Obtener dirección de destino
      const destinationAddress = await this.getDestinationAddress(request.userId, request.addressId);

      // 4. Preparar información del envío
      const shipmentData = await this.prepareShipmentData(order, destinationAddress, request);

      // 5. Crear envío en nuestra base de datos
      const shipment = new this.shipmentModel(shipmentData);
      await shipment.save();

      // 6. Crear envío en DrEnvío
      try {
        const drenvioRequest: DrEnvioShipmentRequest = {
          service: request.service,
          origin: shipmentData.originAddress,
          destination: shipmentData.destinationAddress,
          dimensions: shipmentData.dimensions,
          items: shipmentData.items,
          totalValue: shipmentData.totalValue,
          requiresSignature: request.requiresSignature,
          fragile: request.fragile,
          insured: request.insured,
          specialInstructions: request.specialInstructions,
        };

        const drenvioResponse = await this.drenvioService.createShipment(drenvioRequest);

        // 7. Actualizar con información de DrEnvío
        shipment.drenvioShipmentId = drenvioResponse.shipmentId;
        shipment.drenvioTrackingNumber = drenvioResponse.trackingNumber;
        shipment.drenvioLabel = drenvioResponse.labelUrl;
        shipment.status = ShipmentStatus.CREATED;
        shipment.estimatedDeliveryDate = new Date(drenvioResponse.estimatedDeliveryDate);
        shipment.shippedAt = new Date();

        // Agregar evento inicial de tracking
        shipment.trackingHistory.push({
          timestamp: new Date(),
          status: 'created',
          description: 'Envío creado exitosamente',
          location: 'Centro de distribución',
        });

        await shipment.save();

        this.logger.log(`Shipment created successfully: ${shipment._id}`);
        return shipment;

      } catch (drenvioError) {
        // Si falla la creación en DrEnvío, marcar como error pero mantener el registro
        shipment.status = ShipmentStatus.EXCEPTION;
        shipment.lastError = drenvioError.message;
        await shipment.save();

        this.logger.error('Error creating shipment in DrEnvío:', drenvioError);
        throw new BadRequestException(`Failed to create shipment: ${drenvioError.message}`);
      }

    } catch (error) {
      this.logger.error('Error creating shipment:', error);
      throw error;
    }
  }

  // ===== GESTIÓN DE ENVÍOS =====

  async getShipment(shipmentId: string, userId?: string): Promise<Shipment> {
    const query: any = { _id: shipmentId };
    if (userId) {
      query.userId = userId;
    }

    const shipment = await this.shipmentModel
      .findOne(query)
      .populate('orderId')
      .populate('userId')
      .exec();

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  async cancelShipment(shipmentId: string, userId: string, reason?: string): Promise<boolean> {
    try {
      const shipment = await this.getShipment(shipmentId, userId);

      if (!this.canBeCancelled(shipment.status)) {
        throw new BadRequestException('Shipment cannot be cancelled in current status');
      }

      // Cancelar en DrEnvío si existe
      let drenvioSuccess = true;
      if (shipment.drenvioShipmentId) {
        drenvioSuccess = await this.drenvioService.cancelShipment(
          shipment.drenvioShipmentId,
          reason,
        );
      }

      // Actualizar estado local
      shipment.status = ShipmentStatus.CANCELLED;
      shipment.cancelReason = reason || 'Cancelled by user';
      
      shipment.trackingHistory.push({
        timestamp: new Date(),
        status: 'cancelled',
        description: `Envío cancelado: ${reason || 'Cancelado por el usuario'}`,
      });

      await shipment.save();

      this.logger.log(`Shipment cancelled: ${shipmentId}`);
      return drenvioSuccess;

    } catch (error) {
      this.logger.error(`Error cancelling shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  async rescheduleDelivery(shipmentId: string, userId: string, newDate: Date): Promise<boolean> {
    try {
      const shipment = await this.getShipment(shipmentId, userId);

      if (!this.canBeRescheduled(shipment.status)) {
        throw new BadRequestException('Shipment cannot be rescheduled in current status');
      }

      // TODO: Implementar reprogramación en DrEnvío
      // const success = await this.drenvioService.rescheduleDelivery(shipment.drenvioShipmentId, newDate);

      shipment.estimatedDeliveryDate = newDate;
      shipment.trackingHistory.push({
        timestamp: new Date(),
        status: 'rescheduled',
        description: `Entrega reprogramada para ${newDate.toLocaleDateString()}`,
      });

      await shipment.save();

      this.logger.log(`Shipment rescheduled: ${shipmentId}`);
      return true;

    } catch (error) {
      this.logger.error(`Error rescheduling shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private async getDestinationAddress(userId: string, addressId?: string) {
    if (addressId) {
      return await this.profileService.getAddressById(userId, addressId);
    }

    // Usar dirección por defecto
    const addresses = await this.profileService.getUserAddresses(userId);
    const defaultAddress = addresses.find(addr => addr.isDefault);

    if (!defaultAddress) {
      throw new BadRequestException('No default shipping address found');
    }

    return defaultAddress;
  }

  private async prepareShipmentData(order: any, destinationAddress: any, request: CreateShipmentRequest) {
    // Dirección de origen (empresa)
    const originAddress = {
      name: 'Nabra XR',
      phone: '+54 11 1234-5678',
      street: 'Av. Corrientes 1234',
      neighborhood: 'Centro',
      city: 'Buenos Aires',
      state: 'CABA',
      postalCode: '1043',
      country: 'Argentina',
    };

    // Preparar items del envío
    const items: any[] = [];
    let totalWeight = 0;
    let totalValue = 0;

    for (const orderItem of order.items) {
      const product = orderItem.product;
      const quantity = orderItem.quantity;
      const price = orderItem.price;

      // Estimar peso del producto
      const estimatedWeight = this.estimateProductWeight(product);
      
      totalWeight += estimatedWeight * quantity;
      totalValue += price * quantity;

      items.push({
        name: product?.name || orderItem.productName || 'Producto',
        quantity,
        value: price,
        sku: product?._id?.toString() || '',
        description: product?.description || '',
      });
    }

    // Calcular dimensiones del paquete
    const dimensions = this.calculatePackageDimensions(order.items);

    // Calcular costo de envío (esto debería venir de una cotización previa)
    const shippingCost = await this.calculateShippingCost(
      destinationAddress.postalCode,
      totalWeight,
      request.service,
    );

    return {
      orderId: order._id,
      userId: request.userId,
      service: request.service,
      status: ShipmentStatus.PENDING,
      
      originAddress,
      destinationAddress: {
        name: destinationAddress.receiverName || `${destinationAddress.alias}`,
        phone: destinationAddress.receiverPhone || '',
        street: destinationAddress.street,
        apartment: destinationAddress.apartment,
        neighborhood: destinationAddress.neighborhood,
        city: destinationAddress.city,
        state: destinationAddress.state,
        postalCode: destinationAddress.postalCode,
        country: destinationAddress.country,
        references: destinationAddress.references,
        coordinates: destinationAddress.coordinates,
      },
      
      dimensions: {
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        weight: totalWeight,
      },
      
      items,
      shippingCost,
      totalValue,
      
      requiresSignature: request.requiresSignature || false,
      fragile: request.fragile || false,
      insured: request.insured || false,
      specialInstructions: request.specialInstructions,
      
      trackingHistory: [],
    };
  }

  private estimateProductWeight(product: any): number {
    // Lógica para estimar peso basada en categoría
    const categoryWeights = {
      'sandalias': 0.5,
      'zapatillas': 0.8,
      'botas': 1.2,
      'plataformas': 0.9,
    };

    return categoryWeights[product?.category] || 0.7;
  }

  private calculatePackageDimensions(items: any[]): { length: number; width: number; height: number } {
    // Algoritmo simple para calcular dimensiones del paquete
    const baseBox = { length: 30, width: 25, height: 10 };
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Ajustar dimensiones basado en cantidad de items
    const heightMultiplier = Math.ceil(itemCount / 2);
    
    return {
      length: baseBox.length,
      width: baseBox.width,
      height: baseBox.height * heightMultiplier,
    };
  }

  private async calculateShippingCost(postalCode: string, weight: number, service: ShipmentServiceType): Promise<number> {
    // Lógica básica de cálculo de costo
    const zone = this.getZoneByPostalCode(postalCode);
    const baseRates = {
      CABA: { standard: 1500, express: 2250, same_day: 3000 },
      GBA: { standard: 2500, express: 3750, same_day: 0 },
      INTERIOR: { standard: 3500, express: 5250, same_day: 0 },
    };

    const baseRate = baseRates[zone]?.[service] || 3500;
    const weightMultiplier = Math.max(1, Math.ceil(weight / 5));
    
    return baseRate * weightMultiplier;
  }

  private getZoneByPostalCode(postalCode: string): string {
    const code = postalCode.replace(/\D/g, '');
    
    if (code >= '1000' && code <= '1499') return 'CABA';
    if (code >= '1600' && code <= '1900') return 'GBA';
    return 'INTERIOR';
  }

  private canBeCancelled(status: ShipmentStatus): boolean {
    return [
      ShipmentStatus.PENDING,
      ShipmentStatus.CREATED,
    ].includes(status);
  }

  private canBeRescheduled(status: ShipmentStatus): boolean {
    return [
      ShipmentStatus.FAILED_DELIVERY,
      ShipmentStatus.OUT_FOR_DELIVERY,
    ].includes(status);
  }

  // ===== MÉTODOS PARA INTEGRACIÓN CON ÓRDENES =====

  async createShipmentFromOrder(orderId: string, userId: string, service: ShipmentServiceType = ShipmentServiceType.STANDARD): Promise<Shipment> {
    return this.createShipment({
      orderId,
      userId,
      service,
    });
  }

  async getShipmentByOrderId(orderId: string, userId?: string): Promise<Shipment | null> {
    const query: any = { orderId };
    if (userId) {
      query.userId = userId;
    }

    return this.shipmentModel.findOne(query).populate('orderId').exec();
  }
}
