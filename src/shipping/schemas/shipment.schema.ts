import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';
import { User } from '../../auth/schemas/user.schema';

export enum ShipmentStatus {
  PENDING = 'pending',
  CREATED = 'created',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED_DELIVERY = 'failed_delivery',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
  EXCEPTION = 'exception',
}

export enum ShipmentService {
  STANDARD = 'standard',
  EXPRESS = 'express',
  SAME_DAY = 'same_day',
}

@Schema({ _id: false })
export class ShipmentAddress {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  street: string;

  @Prop()
  apartment?: string;

  @Prop({ required: true })
  neighborhood: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  postalCode: string;

  @Prop({ required: true })
  country: string;

  @Prop()
  references?: string;

  @Prop({ type: Object })
  coordinates?: {
    lat: number;
    lng: number;
  };
}

@Schema({ _id: false })
export class ShipmentDimensions {
  @Prop({ required: true })
  length: number; // cm

  @Prop({ required: true })
  width: number; // cm

  @Prop({ required: true })
  height: number; // cm

  @Prop({ required: true })
  weight: number; // kg
}

@Schema({ _id: false })
export class ShipmentItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  value: number; // MXN

  @Prop()
  sku?: string;

  @Prop()
  description?: string;
}

@Schema({ _id: false })
export class TrackingEvent {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  location?: string;

  @Prop()
  courier?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

@Schema({ timestamps: true })
export class Shipment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Order;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  // Información de DrEnvío
  @Prop({ unique: true, sparse: true })
  drenvioShipmentId?: string;

  @Prop()
  drenvioTrackingNumber?: string;

  @Prop()
  drenvioLabel?: string; // URL del label PDF

  // Estado del envío
  @Prop({ required: true, enum: Object.values(ShipmentStatus), default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  @Prop({ required: true, enum: Object.values(ShipmentService) })
  service: ShipmentService;

  // Direcciones
  @Prop({ required: true, type: ShipmentAddress })
  originAddress: ShipmentAddress;

  @Prop({ required: true, type: ShipmentAddress })
  destinationAddress: ShipmentAddress;

  // Dimensiones y peso
  @Prop({ required: true, type: ShipmentDimensions })
  dimensions: ShipmentDimensions;

  // Items
  @Prop({ required: true, type: [ShipmentItem] })
  items: ShipmentItem[];

  // Costos
  @Prop({ required: true })
  shippingCost: number; // MXN

  @Prop()
  insuranceCost?: number; // MXN

  @Prop({ required: true })
  totalValue: number; // MXN del contenido

  // Fechas
  @Prop()
  estimatedDeliveryDate?: Date;

  @Prop()
  actualDeliveryDate?: Date;

  @Prop()
  shippedAt?: Date;

  // Tracking
  @Prop({ type: [TrackingEvent], default: [] })
  trackingHistory: TrackingEvent[];

  @Prop()
  lastTrackingUpdate?: Date;

  // Configuraciones especiales
  @Prop({ default: false })
  requiresSignature: boolean;

  @Prop({ default: false })
  fragile: boolean;

  @Prop({ default: false })
  insured: boolean;

  @Prop()
  specialInstructions?: string;

  // Información adicional de DrEnvío
  @Prop({ type: Object })
  drenvioData?: {
    serviceId: string;
    carrierName: string;
    estimatedDays: number;
    zone: string;
    restrictions?: string[];
    additionalServices?: string[];
  };

  // Manejo de errores
  @Prop()
  lastError?: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  cancelReason?: string;

  @Prop()
  deliveryAttempts?: number;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);

// Índices para búsquedas eficientes
ShipmentSchema.index({ orderId: 1 });
ShipmentSchema.index({ userId: 1 });
ShipmentSchema.index({ drenvioShipmentId: 1 });
ShipmentSchema.index({ drenvioTrackingNumber: 1 });
ShipmentSchema.index({ status: 1 });
ShipmentSchema.index({ createdAt: -1 });
ShipmentSchema.index({ estimatedDeliveryDate: 1 });
ShipmentSchema.index({ 'destinationAddress.postalCode': 1 });
