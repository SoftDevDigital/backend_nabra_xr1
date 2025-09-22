import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationTemplateDocument = NotificationTemplate & Document;

export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class NotificationTemplate {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  type: string; // NotificationType

  @Prop({ required: true })
  channel: string; // NotificationChannel

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  htmlContent?: string;

  @Prop()
  plainTextContent?: string;

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ enum: TemplateStatus, default: TemplateStatus.DRAFT })
  status: TemplateStatus;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop()
  lastUsedAt?: Date;

  @Prop({ type: Object })
  settings?: {
    allowUnsubscribe?: boolean;
    trackOpens?: boolean;
    trackClicks?: boolean;
    priority?: string;
    maxRetries?: number;
    expiresInHours?: number;
  };

  @Prop()
  category?: string;

  @Prop()
  tags?: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);

// Índices
NotificationTemplateSchema.index({ name: 1 });
NotificationTemplateSchema.index({ type: 1, channel: 1 });
NotificationTemplateSchema.index({ status: 1 });
NotificationTemplateSchema.index({ category: 1 });
