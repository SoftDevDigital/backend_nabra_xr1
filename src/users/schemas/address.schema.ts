import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true })
export class Address {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string; // Nombre descriptivo: "Casa", "Oficina", "Casa de mamá", etc.

  @Prop({ required: true, trim: true })
  street: string; // Calle y número

  @Prop({ trim: true })
  street2?: string; // Colonia, fraccionamiento, etc.

  @Prop({ required: true, trim: true })
  city: string; // Ciudad o municipio

  @Prop({ required: true, trim: true })
  state: string; // Estado

  @Prop({ required: true, trim: true, match: /^\d{5}$/ })
  postalCode: string; // Código postal (5 dígitos)

  @Prop({ required: true, trim: true, default: 'México' })
  country: string; // País

  @Prop({ required: true, trim: true })
  contactName: string; // Nombre de quien recibe

  @Prop({ required: true, trim: true })
  contactPhone: string; // Teléfono de contacto

  @Prop({ trim: true })
  instructions?: string; // Instrucciones especiales de entrega

  @Prop({ default: false })
  isDefault: boolean; // Si es la dirección principal

  @Prop({ default: true })
  isActive: boolean; // Si está activa para selección
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Índices para optimizar consultas
AddressSchema.index({ userId: 1, isActive: 1 });
AddressSchema.index({ userId: 1, isDefault: 1 });