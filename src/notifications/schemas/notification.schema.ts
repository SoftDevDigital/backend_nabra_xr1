import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  // Transaccionales
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  
  // Marketing
  WELCOME = 'welcome',
  PRODUCT_RECOMMENDATION = 'product_recommendation',
  PRICE_DROP = 'price_drop',
  BACK_IN_STOCK = 'back_in_stock',
  CART_ABANDONMENT = 'cart_abandonment',
  PROMOTION = 'promotion',
  
  // Sistema
  SECURITY_ALERT = 'security_alert',
  ACCOUNT_UPDATE = 'account_update',
  REVIEW_REMINDER = 'review_reminder',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true, enum: NotificationChannel })
  channel: NotificationChannel;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Prop({ enum: NotificationPriority, default: NotificationPriority.NORMAL })
  priority: NotificationPriority;

  @Prop()
  scheduledFor?: Date;

  @Prop()
  sentAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 3 })
  maxRetries: number;

  @Prop()
  templateId?: string;

  @Prop({ type: Object })
  templateData?: Record<string, any>;

  @Prop()
  externalId?: string; // ID del servicio externo (SendGrid, Twilio, etc.)

  @Prop()
  unsubscribeToken?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiresAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Índices para optimizar consultas
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1 });
NotificationSchema.index({ channel: 1, status: 1 });
NotificationSchema.index({ scheduledFor: 1, status: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
