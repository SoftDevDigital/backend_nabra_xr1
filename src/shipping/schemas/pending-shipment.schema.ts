import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PendingShipmentDocument = PendingShipment & Document;

@Schema({ 
  timestamps: true,
  collection: 'pending_shipments',
  // TTL de 24 horas - se elimina automáticamente
  expires: 24 * 60 * 60 * 1000 
})
export class PendingShipment {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  paymentId: string;

  @Prop({ required: true })
  orderId: string;

  // Datos del carrito
  @Prop({ required: true })
  cartItems: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    size?: string;
  }>;

  // Dirección de envío seleccionada
  @Prop({ 
    required: true,
    type: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      province: { type: String, required: true },
      country: { type: String, required: true },
      notes: { type: String, required: false }
    }
  })
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    postalCode: string;
    province: string;
    country: string;
    notes?: string;
  };

  // Opción de envío seleccionada
  @Prop({ 
    required: true,
    type: {
      serviceId: { type: String, required: true },
      serviceName: { type: String, required: true },
      service: { type: String, required: true },
      rateId: { type: String, required: true },
      cost: { type: Number, required: true },
      estimatedDays: { type: Number, required: true },
      estimatedDeliveryDate: { type: String, required: true },
      carrier: { type: String, required: true },
      zone: { type: String, required: true }
    }
  })
  selectedShippingOption: {
    serviceId: string;
    serviceName: string;
    service: string;
    rateId: string;
    cost: number;
    estimatedDays: number;
    estimatedDeliveryDate: string;
    carrier: string;
    zone: string;
  };

  // Datos calculados para DrEnvío
  @Prop({ 
    required: true,
    type: {
      weight: { type: Number, required: true },
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true }
    }
  })
  packageDimensions: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };

  @Prop({ required: true })
  totalValue: number;

  // Estado del procesamiento
  @Prop({ 
    required: true, 
    default: 'pending',
    enum: ['pending', 'processing', 'created', 'failed', 'cancelled']
  })
  status: string;

  @Prop()
  drEnvioShipmentId?: string;

  @Prop()
  trackingNumber?: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  processedAt?: Date;
}

export const PendingShipmentSchema = SchemaFactory.createForClass(PendingShipment);
