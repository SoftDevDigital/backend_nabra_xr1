import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Shipment, ShipmentStatus, TrackingEvent } from './schemas/shipment.schema';
import { DrEnvioService } from './drenvio.service';
import { drenvioConfig } from '../config/drenvio.config';

export interface TrackingInfo {
  trackingNumber: string;
  status: ShipmentStatus;
  statusDescription: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  currentLocation?: string;
  progress: number; // Porcentaje de progreso (0-100)
  events: TrackingEvent[];
  shipmentInfo: {
    service: string;
    origin: string;
    destination: string;
    carrier: string;
  };
  canBeCancelled: boolean;
  canBeRescheduled: boolean;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    private drenvioService: DrEnvioService,
  ) {}

  // ===== TRACKING PÚBLICO =====

  async getTrackingInfo(trackingNumber: string): Promise<TrackingInfo> {
    try {
      this.logger.log(`Getting tracking info for: ${trackingNumber}`);

      // Buscar envío en nuestra base de datos
      const shipment = await this.shipmentModel
        .findOne({ drenvioTrackingNumber: trackingNumber })
        .populate('orderId')
        .populate('userId')
        .exec();

      if (!shipment) {
        throw new NotFoundException(`Shipment not found for tracking number: ${trackingNumber}`);
      }

      // Actualizar información desde DrEnvío
      await this.updateShipmentTracking(shipment);

      // Preparar respuesta
      return {
        trackingNumber: shipment.drenvioTrackingNumber!,
        status: shipment.status,
        statusDescription: this.getStatusDescription(shipment.status),
        estimatedDeliveryDate: shipment.estimatedDeliveryDate?.toISOString().split('T')[0],
        actualDeliveryDate: shipment.actualDeliveryDate?.toISOString().split('T')[0],
        currentLocation: this.getCurrentLocation(shipment.trackingHistory),
        progress: this.calculateProgress(shipment.status),
        events: shipment.trackingHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        shipmentInfo: {
          service: this.getServiceName(shipment.service),
          origin: this.formatAddress(shipment.originAddress),
          destination: this.formatAddress(shipment.destinationAddress),
          carrier: shipment.drenvioData?.carrierName || 'DrEnvío',
        },
        canBeCancelled: this.canBeCancelled(shipment.status),
        canBeRescheduled: this.canBeRescheduled(shipment.status),
      };
    } catch (error) {
      this.logger.error(`Error getting tracking info for ${trackingNumber}:`, error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error retrieving tracking information');
    }
  }

  async getTrackingInfoByOrderId(orderId: string, userId: string): Promise<TrackingInfo | null> {
    const shipment = await this.shipmentModel
      .findOne({ orderId, userId })
      .exec();

    if (!shipment || !shipment.drenvioTrackingNumber) {
      return null;
    }

    return this.getTrackingInfo(shipment.drenvioTrackingNumber);
  }

  async getUserShipments(userId: string, limit: number = 10, offset: number = 0): Promise<Shipment[]> {
    return this.shipmentModel
      .find({ userId })
      .populate('orderId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  // ===== ACTUALIZACIÓN DE TRACKING =====

  async updateShipmentTracking(shipment: Shipment): Promise<void> {
    try {
      if (!shipment.drenvioTrackingNumber) {
        return;
      }

      // Obtener información actualizada de DrEnvío
      const trackingInfo = await this.drenvioService.getTrackingInfo(shipment.drenvioTrackingNumber);

      // Actualizar estado si cambió
      const newStatus = this.mapDrEnvioStatusToLocal(trackingInfo.status);
      if (newStatus !== shipment.status) {
        shipment.status = newStatus;
        this.logger.log(`Status updated for ${shipment.drenvioTrackingNumber}: ${newStatus}`);
      }

      // Actualizar fecha de entrega real
      if (trackingInfo.actualDeliveryDate && !shipment.actualDeliveryDate) {
        shipment.actualDeliveryDate = new Date(trackingInfo.actualDeliveryDate);
      }

      // Actualizar eventos de tracking
      const newEvents = trackingInfo.events.filter(event => 
        !shipment.trackingHistory.some(existing => 
          existing.timestamp.getTime() === new Date(event.timestamp).getTime() &&
          existing.status === event.status
        )
      );

      for (const event of newEvents) {
        shipment.trackingHistory.push({
          timestamp: new Date(event.timestamp),
          status: event.status,
          description: event.description,
          location: event.location,
          courier: event.courier,
        });
      }

      shipment.lastTrackingUpdate = new Date();
      await shipment.save();

      // Enviar notificaciones si es necesario
      await this.sendTrackingNotifications(shipment, newEvents);

    } catch (error) {
      this.logger.error(`Error updating tracking for ${shipment._id}:`, error);
      
      // Incrementar contador de errores
      shipment.retryCount = (shipment.retryCount || 0) + 1;
      shipment.lastError = error.message;
      await shipment.save();
    }
  }

  // ===== CRON JOB PARA ACTUALIZACIÓN AUTOMÁTICA =====

  @Cron(CronExpression.EVERY_HOUR)
  async updateAllActiveShipments(): Promise<void> {
    this.logger.log('Starting automatic tracking update');

    try {
      // Obtener envíos activos que necesitan actualización
      const activeShipments = await this.shipmentModel
        .find({
          status: { 
            $in: [
              ShipmentStatus.CREATED,
              ShipmentStatus.IN_TRANSIT,
              ShipmentStatus.OUT_FOR_DELIVERY,
            ]
          },
          drenvioTrackingNumber: { $exists: true, $ne: null },
          $or: [
            { lastTrackingUpdate: { $lt: new Date(Date.now() - drenvioConfig.tracking.updateInterval) } },
            { lastTrackingUpdate: { $exists: false } },
          ],
          retryCount: { $lt: drenvioConfig.tracking.maxRetries },
        })
        .limit(50) // Procesar máximo 50 por vez
        .exec();

      this.logger.log(`Found ${activeShipments.length} shipments to update`);

      // Actualizar en lotes para evitar sobrecargar la API
      const batchSize = 5;
      for (let i = 0; i < activeShipments.length; i += batchSize) {
        const batch = activeShipments.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(shipment => this.updateShipmentTracking(shipment))
        );

        // Pausa entre lotes
        if (i + batchSize < activeShipments.length) {
          await new Promise(resolve => setTimeout(resolve, drenvioConfig.tracking.retryDelay));
        }
      }

      this.logger.log('Automatic tracking update completed');
    } catch (error) {
      this.logger.error('Error in automatic tracking update:', error);
    }
  }

  // ===== NOTIFICACIONES =====

  private async sendTrackingNotifications(shipment: Shipment, newEvents: any[]): Promise<void> {
    // Filtrar eventos importantes para notificaciones
    const importantEvents = newEvents.filter(event => 
      ['out_for_delivery', 'delivered', 'failed_delivery', 'exception'].includes(event.status)
    );

    for (const event of importantEvents) {
      try {
        // TODO: Integrar con servicio de notificaciones (email, SMS, push)
        this.logger.log(`Notification needed for ${shipment.drenvioTrackingNumber}: ${event.status}`);
        
        // Aquí se integraría con:
        // - Servicio de email
        // - Servicio de SMS
        // - Notificaciones push
        // - Webhooks del cliente
      } catch (error) {
        this.logger.error('Error sending tracking notification:', error);
      }
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private mapDrEnvioStatusToLocal(drenvioStatus: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      'pending': ShipmentStatus.PENDING,
      'created': ShipmentStatus.CREATED,
      'picked_up': ShipmentStatus.IN_TRANSIT,
      'in_transit': ShipmentStatus.IN_TRANSIT,
      'out_for_delivery': ShipmentStatus.OUT_FOR_DELIVERY,
      'delivered': ShipmentStatus.DELIVERED,
      'failed_delivery': ShipmentStatus.FAILED_DELIVERY,
      'returned': ShipmentStatus.RETURNED,
      'cancelled': ShipmentStatus.CANCELLED,
      'exception': ShipmentStatus.EXCEPTION,
    };

    return statusMap[drenvioStatus] || ShipmentStatus.EXCEPTION;
  }

  private getStatusDescription(status: ShipmentStatus): string {
    const descriptions: Record<ShipmentStatus, string> = {
      [ShipmentStatus.PENDING]: 'Envío pendiente de creación',
      [ShipmentStatus.CREATED]: 'Envío creado, esperando recolección',
      [ShipmentStatus.IN_TRANSIT]: 'En tránsito hacia el destino',
      [ShipmentStatus.OUT_FOR_DELIVERY]: 'En reparto, será entregado hoy',
      [ShipmentStatus.DELIVERED]: 'Entregado exitosamente',
      [ShipmentStatus.FAILED_DELIVERY]: 'Intento de entrega fallido',
      [ShipmentStatus.RETURNED]: 'Devuelto al origen',
      [ShipmentStatus.CANCELLED]: 'Envío cancelado',
      [ShipmentStatus.EXCEPTION]: 'Excepción en el envío',
    };

    return descriptions[status] || 'Estado desconocido';
  }

  private getCurrentLocation(trackingHistory: TrackingEvent[]): string | undefined {
    const sortedEvents = trackingHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sortedEvents.find(event => event.location)?.location;
  }

  private calculateProgress(status: ShipmentStatus): number {
    const progressMap: Record<ShipmentStatus, number> = {
      [ShipmentStatus.PENDING]: 0,
      [ShipmentStatus.CREATED]: 20,
      [ShipmentStatus.IN_TRANSIT]: 60,
      [ShipmentStatus.OUT_FOR_DELIVERY]: 90,
      [ShipmentStatus.DELIVERED]: 100,
      [ShipmentStatus.FAILED_DELIVERY]: 85,
      [ShipmentStatus.RETURNED]: 100,
      [ShipmentStatus.CANCELLED]: 0,
      [ShipmentStatus.EXCEPTION]: 50,
    };

    return progressMap[status] || 0;
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

  private getServiceName(service: string): string {
    const serviceNames = {
      standard: 'Envío Estándar',
      express: 'Envío Express',
      same_day: 'Envío Mismo Día',
    };

    return serviceNames[service] || service;
  }

  private formatAddress(address: any): string {
    return `${address.city}, ${address.state}`;
  }

  // ===== MÉTODOS ADMINISTRATIVOS =====

  async getShipmentStatistics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const matchStage: any = {};
    
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = dateFrom;
      if (dateTo) matchStage.createdAt.$lte = dateTo;
    }

    const stats = await this.shipmentModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgCost: { $avg: '$shippingCost' },
          totalValue: { $sum: '$totalValue' },
        },
      },
    ]);

    return stats;
  }

  async getDeliveryPerformance(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const matchStage: any = {
      status: ShipmentStatus.DELIVERED,
      actualDeliveryDate: { $exists: true },
      estimatedDeliveryDate: { $exists: true },
    };
    
    if (dateFrom || dateTo) {
      matchStage.actualDeliveryDate = {};
      if (dateFrom) matchStage.actualDeliveryDate.$gte = dateFrom;
      if (dateTo) matchStage.actualDeliveryDate.$lte = dateTo;
    }

    const performance = await this.shipmentModel.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          deliveryDifference: {
            $divide: [
              { $subtract: ['$actualDeliveryDate', '$estimatedDeliveryDate'] },
              1000 * 60 * 60 * 24, // Convertir a días
            ],
          },
        },
      },
      {
        $group: {
          _id: '$service',
          totalDeliveries: { $sum: 1 },
          onTimeDeliveries: {
            $sum: {
              $cond: [{ $lte: ['$deliveryDifference', 0] }, 1, 0],
            },
          },
          avgDelayDays: { $avg: '$deliveryDifference' },
          maxDelayDays: { $max: '$deliveryDifference' },
        },
      },
      {
        $addFields: {
          onTimePercentage: {
            $multiply: [
              { $divide: ['$onTimeDeliveries', '$totalDeliveries'] },
              100,
            ],
          },
        },
      },
    ]);

    return performance;
  }
}
