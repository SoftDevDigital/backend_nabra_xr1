import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShipmentProcessorService } from '../services/shipment-processor.service';

@Injectable()
export class ShipmentProcessorTask {
  private readonly logger = new Logger(ShipmentProcessorTask.name);

  constructor(
    private shipmentProcessorService: ShipmentProcessorService,
  ) {}

  /**
   * Procesa envíos pendientes cada 5 minutos
   * DESHABILITADO: No se usa en el flujo simplificado
   */
  // @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingShipments() {
    // Tarea deshabilitada - no se usa en el flujo simplificado
    return;
  }

  /**
   * Limpia envíos fallidos cada hora
   * DESHABILITADO: No se usa en el flujo simplificado
   */
  // @Cron(CronExpression.EVERY_HOUR)
  async cleanupFailedShipments() {
    // Tarea deshabilitada - no se usa en el flujo simplificado
    return;
  }
}
