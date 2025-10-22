import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { SimplePromotionType, SimplePromotionTarget } from '../dtos/simple-promotion.dto';

export enum PromotionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired'
}

@Schema({ timestamps: true })
export class SimplePromotion extends Document {
  @Prop({ required: true, maxlength: 100 })
  name: string;

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop({ required: true, enum: Object.values(SimplePromotionType) })
  type: SimplePromotionType;

  @Prop({ required: true, enum: Object.values(SimplePromotionTarget) })
  target: SimplePromotionTarget;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  // Reglas de descuento
  @Prop()
  discountPercentage?: number;

  @Prop()
  discountAmount?: number;

  @Prop()
  buyQuantity?: number;

  @Prop()
  getQuantity?: number;

  // Condiciones
  @Prop({ type: [String] })
  specificProducts?: string[];

  @Prop()
  category?: string;

  @Prop()
  minimumPurchaseAmount?: number;

  @Prop()
  minimumQuantity?: number;

  // Estado
  @Prop({ required: true, enum: Object.values(PromotionStatus), default: PromotionStatus.ACTIVE })
  status: PromotionStatus;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  isAutomatic: boolean;

  // Tracking básico
  @Prop({ default: 0 })
  totalUses: number;

  @Prop({ default: 0 })
  totalDiscountGiven: number;

  // Solo el creador
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: User;
}

export const SimplePromotionSchema = SchemaFactory.createForClass(SimplePromotion);

// Solo índices esenciales
SimplePromotionSchema.index({ status: 1, startDate: 1, endDate: 1 });
SimplePromotionSchema.index({ type: 1, target: 1 });
SimplePromotionSchema.index({ 'specificProducts': 1 });
SimplePromotionSchema.index({ category: 1 });
SimplePromotionSchema.index({ isActive: 1, isAutomatic: 1 });