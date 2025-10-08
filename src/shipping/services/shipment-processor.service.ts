import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PendingShipment, PendingShipmentDocument } from '../schemas/pending-shipment.schema';
import { DrEnvioService, DrEnvioShipmentRequest } from '../drenvio.service';
import { CartService } from '../../cart/cart.service';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class ShipmentProcessorService {
  private readonly logger = new Logger(ShipmentProcessorService.name);

  constructor(
    @InjectModel(PendingShipment.name)
    private pendingShipmentModel: Model<PendingShipmentDocument>,
    private drEnvioService: DrEnvioService,
    private cartService: CartService,
    private ordersService: OrdersService,
  ) {}

  /**
   * Guarda datos temporales de envío cuando se confirma el pago
   */
  async savePendingShipmentData(
    userId: string,
    paymentId: string,
    orderId: string,
    cartData: any,
    shippingAddress: any,
    selectedShippingOption: any,
  ): Promise<void> {
    try {
      console.log('🚀 [SHIPMENT-PROCESSOR] Iniciando guardado de datos de envío pendiente');
      console.log('📊 [SHIPMENT-PROCESSOR] Datos recibidos:', {
        userId,
        paymentId,
        orderId,
        cartItemsCount: cartData.items?.length || 0,
        shippingAddress: shippingAddress.city,
        selectedService: selectedShippingOption.serviceName,
      });

      // Calcular dimensiones totales del paquete
      const packageDimensions = this.calculatePackageDimensions(cartData.items);
      console.log('📦 [SHIPMENT-PROCESSOR] Dimensiones calculadas:', packageDimensions);

      // Calcular valor total
      const totalValue = cartData.items.reduce((total: number, item: any) => 
        total + (item.price * item.quantity), 0
      );
      console.log('💰 [SHIPMENT-PROCESSOR] Valor total calculado:', totalValue);

      const pendingShipment = new this.pendingShipmentModel({
        userId,
        paymentId,
        orderId,
        cartItems: cartData.items.map((item: any) => ({
          productId: item.productId,
          name: item.name || 'Producto',
          quantity: item.quantity,
          price: item.price,
          weight: item.weight || 0.5, // Peso por defecto si no está definido
          dimensions: {
            length: item.dimensions?.length || 10,
            width: item.dimensions?.width || 10,
            height: item.dimensions?.height || 10,
          },
          size: item.size,
        })),
        shippingAddress,
        selectedShippingOption,
        packageDimensions,
        totalValue,
        status: 'pending',
      });

      await pendingShipment.save();
      console.log('✅ [SHIPMENT-PROCESSOR] Datos de envío guardados exitosamente');
      console.log('🆔 [SHIPMENT-PROCESSOR] ID del envío pendiente:', pendingShipment._id);

    } catch (error) {
      console.error('❌ [SHIPMENT-PROCESSOR] Error guardando datos de envío:', error);
      throw error;
    }
  }

  /**
   * Procesa envíos pendientes automáticamente
   */
  async processPendingShipments(): Promise<void> {
    try {
      // procesamiento de envíos pendientes
      
      const pendingShipments = await this.pendingShipmentModel
        .find({ status: 'pending' })
        .limit(10) // Procesar máximo 10 a la vez
        .exec();

      // encontrados envíos pendientes

      for (const pendingShipment of pendingShipments) {
        try {
          // procesando envío individual
          await this.processSingleShipment(pendingShipment);
        } catch (error) {
          console.error(`❌ [SHIPMENT-PROCESSOR] Error procesando envío ${pendingShipment._id}:`, error);
          
          // Marcar como fallido
          await this.pendingShipmentModel.updateOne(
            { _id: pendingShipment._id },
            { 
              status: 'failed', 
              errorMessage: error.message,
              processedAt: new Date()
            }
          );
        }
      }

      // fin procesamiento de envíos

    } catch (error) {
      console.error('❌ [SHIPMENT-PROCESSOR] Error en procesamiento general:', error);
      throw error;
    }
  }

  /**
   * Procesa un envío individual
   */
  private async processSingleShipment(pendingShipment: PendingShipmentDocument): Promise<void> {
    try {
      // procesando envío individual
      
      // Marcar como procesando
      await this.pendingShipmentModel.updateOne(
        { _id: pendingShipment._id },
        { status: 'processing' }
      );
      // estado actualizado a processing

      // Preparar datos para DrEnvío
      // Log reducido para evitar spam en consola
      this.logger.debug('Preparando datos para DrEnvío', {
        serviceId: pendingShipment.selectedShippingOption.serviceId,
        carrier: pendingShipment.selectedShippingOption.carrier,
        service: pendingShipment.selectedShippingOption.service,
        rateId: pendingShipment.selectedShippingOption.rateId
      });

      const drEnvioRequest: DrEnvioShipmentRequest = {
        service: pendingShipment.selectedShippingOption.serviceId, // CRÍTICO: serviceId para DrEnvío
        origin: {
          name: 'Nabra',
          phone: '+52 55 1234-5678',
          street: 'Av. Insurgentes Sur 1234',
          neighborhood: 'Colonia del Valle',
          city: 'Ciudad de México',
          state: 'CDMX',
          postalCode: '03100',
          country: 'México',
        },
        destination: {
          name: pendingShipment.shippingAddress.fullName,
          phone: pendingShipment.shippingAddress.phone,
          street: pendingShipment.shippingAddress.addressLine,
          neighborhood: 'Roma Norte', // Valor por defecto ya que no está en la estructura del carrito
          city: pendingShipment.shippingAddress.city,
          state: pendingShipment.shippingAddress.province,
          postalCode: pendingShipment.shippingAddress.postalCode,
          country: pendingShipment.shippingAddress.country,
        },
        dimensions: pendingShipment.packageDimensions,
        items: pendingShipment.cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          weight: item.weight,
          value: item.price * item.quantity,
        })),
        totalValue: pendingShipment.totalValue,
        requiresSignature: true,
        fragile: false,
        insured: pendingShipment.totalValue > 1000,
        specialInstructions: pendingShipment.shippingAddress.notes || 'Manejar con cuidado',
      };

      // datos preparados para DrEnvío

      // Crear envío en DrEnvío
      // enviando solicitud a DrEnvío
      const drEnvioResponse = await this.drEnvioService.createShipment(drEnvioRequest);
      
      console.log('✅ [SHIPMENT-PROCESSOR] Respuesta de DrEnvío recibida:', {
        shipmentId: drEnvioResponse.shipmentId,
        trackingNumber: drEnvioResponse.trackingNumber,
        status: drEnvioResponse.status,
        cost: drEnvioResponse.cost,
      });

      // Actualizar envío pendiente con datos de DrEnvío
      await this.pendingShipmentModel.updateOne(
        { _id: pendingShipment._id },
        {
          status: 'created',
          drEnvioShipmentId: drEnvioResponse.shipmentId,
          trackingNumber: drEnvioResponse.trackingNumber,
          processedAt: new Date(),
        }
      );
      console.log('📝 [SHIPMENT-PROCESSOR] Envío pendiente actualizado con datos de DrEnvío');

      // Nota: Actualización de orden con información de envío deshabilitada
      // ya que el flujo principal no incluye envío automático
      console.log('📋 [SHIPMENT-PROCESSOR] Información de envío procesada (orden no actualizada - flujo simplificado)');

      // Limpiar carrito del usuario
      await this.cartService.clearCart(pendingShipment.userId);
      console.log('🛒 [SHIPMENT-PROCESSOR] Carrito limpiado para el usuario');

      // Eliminar envío pendiente (ya no es necesario)
      await this.pendingShipmentModel.deleteOne({ _id: pendingShipment._id });
      console.log('🗑️ [SHIPMENT-PROCESSOR] Envío pendiente eliminado (procesado exitosamente)');

      console.log(`✅ [SHIPMENT-PROCESSOR] Envío ${pendingShipment._id} procesado exitosamente`);

    } catch (error) {
      console.error(`❌ [SHIPMENT-PROCESSOR] Error procesando envío individual ${pendingShipment._id}:`, error);
      
      // Marcar como fallido
      await this.pendingShipmentModel.updateOne(
        { _id: pendingShipment._id },
        { 
          status: 'failed', 
          errorMessage: error.message,
          processedAt: new Date()
        }
      );
      
      throw error;
    }
  }

  /**
   * Calcula las dimensiones totales del paquete
   */
  private calculatePackageDimensions(items: any[]): {
    weight: number;
    length: number;
    width: number;
    height: number;
  } {
    console.log('📐 [SHIPMENT-PROCESSOR] Calculando dimensiones del paquete...');
    
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    items.forEach((item, index) => {
      const itemWeight = (item.weight || 0.5) * item.quantity;
      const itemLength = item.dimensions?.length || 10;
      const itemWidth = item.dimensions?.width || 10;
      const itemHeight = item.dimensions?.height || 10;

      totalWeight += itemWeight;
      maxLength = Math.max(maxLength, itemLength);
      maxWidth = Math.max(maxWidth, itemWidth);
      totalHeight += itemHeight * item.quantity;

      console.log(`📦 [SHIPMENT-PROCESSOR] Item ${index + 1}:`, {
        name: item.name,
        quantity: item.quantity,
        weight: itemWeight,
        dimensions: `${itemLength}x${itemWidth}x${itemHeight}`,
      });
    });

    const dimensions = {
      weight: Math.max(totalWeight, 0.1), // Mínimo 100g
      length: Math.max(maxLength, 10), // Mínimo 10cm
      width: Math.max(maxWidth, 10), // Mínimo 10cm
      height: Math.max(totalHeight, 5), // Mínimo 5cm
    };

    console.log('📏 [SHIPMENT-PROCESSOR] Dimensiones finales calculadas:', dimensions);
    return dimensions;
  }

  /**
   * Obtiene estadísticas de envíos pendientes
   */
  async getPendingShipmentsStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    created: number;
    failed: number;
  }> {
    const stats = await this.pendingShipmentModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      pending: 0,
      processing: 0,
      created: 0,
      failed: 0,
    };

    stats.forEach(stat => {
      result.total += stat.count;
      result[stat._id] = stat.count;
    });

    return result;
  }
}
