import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum GoogleAuthStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Schema({ _id: false })
export class GoogleProfile {
  @Prop({ required: true })
  id: string; // Google ID

  @Prop({ required: true })
  email: string;

  @Prop()
  verified_email?: boolean;

  @Prop()
  name?: string;

  @Prop()
  given_name?: string;

  @Prop()
  family_name?: string;

  @Prop()
  picture?: string;

  @Prop()
  locale?: string;
}

@Schema({ _id: false })
export class GoogleTokens {
  @Prop()
  access_token?: string;

  @Prop()
  refresh_token?: string;

  @Prop()
  expires_in?: number;

  @Prop()
  token_type?: string;

  @Prop()
  scope?: string;

  @Prop()
  id_token?: string;
}

@Schema({ timestamps: true })
export class GoogleUser extends Document {
  @Prop({ required: true, unique: true, index: true })
  googleId: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true, type: GoogleProfile })
  googleProfile: GoogleProfile;

  @Prop({ type: GoogleTokens })
  tokens?: GoogleTokens;

  @Prop({ required: true, enum: Object.values(GoogleAuthStatus), default: GoogleAuthStatus.ACTIVE })
  status: GoogleAuthStatus;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastTokenRefresh?: Date;

  // Información adicional del usuario
  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  displayName?: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  locale?: string;

  @Prop()
  timezone?: string;

  // Metadatos de seguridad
  @Prop({ default: 0 })
  loginCount: number;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop()
  lastFailedLoginAt?: Date;

  @Prop({ type: [String], default: [] })
  ipAddresses: string[];

  @Prop({ type: [String], default: [] })
  userAgents: string[];

  // Configuraciones del usuario
  @Prop({ default: false })
  emailNotifications: boolean;

  @Prop({ default: false })
  marketingEmails: boolean;

  @Prop({ default: 'es' })
  preferredLanguage: string;

  // Referencia al usuario principal (si existe)
  @Prop({ type: Types.ObjectId, ref: 'User', unique: true, sparse: true })
  linkedUserId?: Types.ObjectId;

  // ===== DATOS PERSONALES CONFIGURABLES =====
  
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

  // Información de contacto adicional
  @Prop()
  phone?: string;

  @Prop()
  alternativeEmail?: string;

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

  // Preferencias de notificaciones específicas
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

  // Información de creación
  @Prop({ default: Date.now })
  firstLoginAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const GoogleUserSchema = SchemaFactory.createForClass(GoogleUser);

// Exportar el tipo de documento
export type GoogleUserDocument = GoogleUser & Document;

// Índices para optimización
GoogleUserSchema.index({ googleId: 1 }, { unique: true });
GoogleUserSchema.index({ email: 1 }, { unique: true });
GoogleUserSchema.index({ status: 1 });
GoogleUserSchema.index({ lastLoginAt: -1 });
GoogleUserSchema.index({ createdAt: -1 });
GoogleUserSchema.index({ linkedUserId: 1 }, { sparse: true });

// Middleware para actualizar lastLoginAt en cada login exitoso
GoogleUserSchema.pre('save', function(next) {
  if (this.isModified('loginCount') && this.loginCount > 0) {
    this.lastLoginAt = new Date();
  }
  next();
});
