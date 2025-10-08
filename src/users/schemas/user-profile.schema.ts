import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

export enum DocumentType {
  DNI = 'dni',
  PASSPORT = 'passport',
  CEDULA = 'cedula',
  RUT = 'rut',
  OTHER = 'other',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum PhoneType {
  MOBILE = 'mobile',
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}

@Schema({ _id: false })
export class PhoneNumber {
  @Prop({ required: true, maxlength: 5 })
  countryCode: string; // +54, +1, etc.

  @Prop({ required: true, maxlength: 20 })
  number: string;

  @Prop({ required: true, enum: Object.values(PhoneType) })
  type: PhoneType;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isPrimary: boolean;

  @Prop({ maxlength: 50 })
  label?: string; // "Personal", "Trabajo", etc.
}

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ required: true, maxlength: 100 })
  name: string;

  @Prop({ required: true, maxlength: 100 })
  relationship: string; // "Madre", "Esposo", "Hermano", etc.

  @Prop({ required: true })
  phone: PhoneNumber;

  @Prop({ maxlength: 200 })
  email?: string;
}

@Schema({ _id: false })
export class PersonalDocument {
  @Prop({ required: true, enum: Object.values(DocumentType) })
  type: DocumentType;

  @Prop({ required: true, maxlength: 50 })
  number: string;

  @Prop({ maxlength: 100 })
  issuingCountry?: string;

  @Prop()
  expirationDate?: Date;

  @Prop({ default: false })
  isVerified: boolean;
}

@Schema({ _id: false })
export class PreferencesSettings {
  @Prop({ default: 'es' })
  language: string;

  @Prop({ default: 'MXN' })
  currency: string;

  @Prop({ default: 'America/Mexico_City' })
  timezone: string;

  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  smsNotifications: boolean;

  @Prop({ default: true })
  pushNotifications: boolean;

  @Prop({ default: true })
  promotionalEmails: boolean;

  @Prop({ default: false })
  twoFactorAuth: boolean;
}

@Schema({ timestamps: true })
export class UserProfile extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: User;

  // Información Personal Básica
  @Prop({ required: true, maxlength: 100 })
  firstName: string;

  @Prop({ required: true, maxlength: 100 })
  lastName: string;

  @Prop({ maxlength: 100 })
  middleName?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ enum: Object.values(Gender) })
  gender?: Gender;

  @Prop({ maxlength: 20 })
  nationality?: string;

  // Documentos de Identidad
  @Prop({ type: [PersonalDocument] })
  documents: PersonalDocument[];

  // Información de Contacto
  @Prop({ type: [PhoneNumber] })
  phoneNumbers: PhoneNumber[];

  @Prop({ maxlength: 200 })
  alternativeEmail?: string;

  // Contactos de Emergencia
  @Prop({ type: [EmergencyContact] })
  emergencyContacts: EmergencyContact[];

  // Información Profesional/Laboral
  @Prop({ maxlength: 200 })
  occupation?: string;

  @Prop({ maxlength: 200 })
  company?: string;

  @Prop({ type: Object })
  workAddress?: {
    company: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };

  // Preferencias y Configuración
  @Prop({ type: PreferencesSettings, default: {} })
  preferences: PreferencesSettings;

  // Información de Perfil
  @Prop({ maxlength: 500 })
  bio?: string;

  @Prop()
  profilePicture?: string; // URL de la imagen

  // Verificaciones
  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ default: false })
  isIdentityVerified: boolean;

  @Prop({ default: false })
  isAddressVerified: boolean;

  // Fechas importantes
  @Prop()
  lastLoginAt?: Date;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop()
  phoneVerifiedAt?: Date;

  @Prop()
  identityVerifiedAt?: Date;

  // Datos para DrEnvío
  @Prop({ type: Object })
  drEnvioProfile?: {
    customerId?: string;
    preferredDeliveryTime?: string;
    specialInstructions?: string;
    deliveryPreferences?: {
      allowWeekendDelivery: boolean;
      allowEveningDelivery: boolean;
      requireSignature: boolean;
      allowNeighborDelivery: boolean;
    };
  };

  // Estadísticas del usuario
  @Prop({ type: Object, default: {} })
  stats?: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    memberSince: Date;
    loyaltyPoints?: number;
  };
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

// Índices para búsquedas eficientes
UserProfileSchema.index({ userId: 1 }, { unique: true });
UserProfileSchema.index({ 'documents.type': 1, 'documents.number': 1 });
UserProfileSchema.index({ 'phoneNumbers.number': 1 });
UserProfileSchema.index({ firstName: 'text', lastName: 'text' });
