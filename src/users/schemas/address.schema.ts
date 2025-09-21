import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

export enum AddressType {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
  BILLING = 'billing',
  SHIPPING = 'shipping',
}

@Schema({ timestamps: true })
export class Address extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true, enum: Object.values(AddressType) })
  type: AddressType;

  @Prop({ required: true, maxlength: 100 })
  alias: string; // "Casa", "Trabajo", "Casa de mamá", etc.

  @Prop({ required: true, maxlength: 200 })
  street: string; // Calle y número

  @Prop({ maxlength: 100 })
  apartment?: string; // Piso, departamento, oficina

  @Prop({ required: true, maxlength: 100 })
  neighborhood: string; // Barrio/Colonia

  @Prop({ required: true, maxlength: 100 })
  city: string;

  @Prop({ required: true, maxlength: 100 })
  state: string; // Estado/Provincia

  @Prop({ required: true, maxlength: 20 })
  postalCode: string;

  @Prop({ required: true, maxlength: 100 })
  country: string;

  @Prop({ maxlength: 500 })
  references?: string; // Referencias para encontrar la dirección

  @Prop({ maxlength: 100 })
  receiverName?: string; // Nombre de quien recibe (si es diferente al usuario)

  @Prop({ maxlength: 20 })
  receiverPhone?: string; // Teléfono de quien recibe

  @Prop({ default: false })
  isDefault: boolean; // Dirección por defecto

  @Prop({ default: true })
  isActive: boolean; // Si la dirección está activa

  // Coordenadas para DrEnvío
  @Prop({ type: { lat: Number, lng: Number } })
  coordinates?: {
    lat: number;
    lng: number;
  };

  // Validación de DrEnvío
  @Prop({ default: false })
  isValidatedByDrEnvio: boolean;

  @Prop()
  drEnvioZoneId?: string; // ID de zona de DrEnvío

  @Prop({ type: Object })
  drEnvioData?: {
    deliveryZone: string;
    estimatedDeliveryTime: string;
    shippingCost: number;
    restrictions?: string[];
  };
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Índices para búsquedas eficientes
AddressSchema.index({ userId: 1, isDefault: 1 });
AddressSchema.index({ userId: 1, type: 1 });
AddressSchema.index({ userId: 1, isActive: 1 });
