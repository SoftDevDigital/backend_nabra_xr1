import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferenceDocument = NotificationPreference & Document;

export enum PreferenceLevel {
  DISABLED = 'disabled',
  EMAIL_ONLY = 'email_only',
  SMS_ONLY = 'sms_only',
  PUSH_ONLY = 'push_only',
  EMAIL_AND_SMS = 'email_and_sms',
  EMAIL_AND_PUSH = 'email_and_push',
  SMS_AND_PUSH = 'sms_and_push',
  ALL_CHANNELS = 'all_channels',
}

@Schema({ timestamps: true })
export class NotificationPreference {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  preferences: {
    // Transaccionales
    order_confirmed?: PreferenceLevel;
    order_shipped?: PreferenceLevel;
    order_delivered?: PreferenceLevel;
    payment_success?: PreferenceLevel;
    payment_failed?: PreferenceLevel;
    
    // Marketing
    welcome?: PreferenceLevel;
    product_recommendation?: PreferenceLevel;
    price_drop?: PreferenceLevel;
    back_in_stock?: PreferenceLevel;
    cart_abandonment?: PreferenceLevel;
    promotion?: PreferenceLevel;
    
    // Sistema
    security_alert?: PreferenceLevel;
    account_update?: PreferenceLevel;
    review_reminder?: PreferenceLevel;
  };

  @Prop({ type: Object, default: {} })
  channelSettings: {
    email?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly' | 'never';
      quietHours?: {
        enabled: boolean;
        start: string; // HH:mm format
        end: string; // HH:mm format
        timezone: string;
      };
    };
    sms?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly' | 'never';
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
    push?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly' | 'never';
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
  };

  @Prop({ type: [String], default: [] })
  blockedTypes: string[];

  @Prop({ type: [String], default: [] })
  blockedCategories: string[];

  @Prop({ default: true })
  allowMarketing: boolean;

  @Prop({ default: true })
  allowTransactional: boolean;

  @Prop({ default: true })
  allowSystem: boolean;

  @Prop({ default: 'es' })
  language: string;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  lastUpdatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);

// Índices
NotificationPreferenceSchema.index({ userId: 1 });
NotificationPreferenceSchema.index({ isActive: 1 });
