import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  // ===== DATOS CONFIGURABLES DESPUÉS DEL REGISTRO =====
  
  // Información de contacto adicional
  @Prop()
  phone?: string;

  @Prop()
  alternativeEmail?: string;

  // Direcciones de envío (múltiples direcciones)
  @Prop({ type: [Object], default: [] })
  addresses: Array<{
    _id?: string;
    type: 'home' | 'work' | 'other';
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
    isDefault: boolean;
    createdAt: Date;
  }>;

  // Preferencias de envío
  @Prop({ default: 'standard' })
  preferredShippingMethod: string;

  @Prop({ default: false })
  allowWeekendDelivery: boolean;

  @Prop({ default: false })
  allowEveningDelivery: boolean;

  // Preferencias de facturación
  @Prop({ default: false })
  requiresInvoice: boolean;

  @Prop()
  taxId?: string;

  @Prop()
  companyName?: string;

  // Preferencias de notificaciones
  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  orderNotifications: boolean;

  @Prop({ default: true })
  shippingNotifications: boolean;

  @Prop({ default: true })
  promotionNotifications: boolean;

  @Prop({ default: false })
  smsNotifications: boolean;

  // Preferencias de privacidad
  @Prop({ default: true })
  allowDataProcessing: boolean;

  @Prop({ default: false })
  allowMarketingEmails: boolean;

  @Prop({ default: false })
  allowDataSharing: boolean;

  // Configuraciones de idioma y región
  @Prop({ default: 'es' })
  preferredLanguage: string;

  @Prop()
  timezone?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }); // Índice único para búsquedas rápidas por email
