import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { SimplePromotion } from './simple-promotion.schema';

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  USED = 'used'
}

@Schema({ _id: false })
export class CouponUsage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  usedAt: Date;

  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  discountAmount: number;
}

@Schema({ timestamps: true })
export class SimpleCoupon extends Document {
  @Prop({ required: true, unique: true, uppercase: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'SimplePromotion', required: true })
  promotionId: SimplePromotion;

  @Prop({ required: true })
  validFrom: Date;

  @Prop({ required: true })
  validUntil: Date;

  @Prop()
  minimumPurchaseAmount?: number;

  @Prop()
  maxUses?: number;

  @Prop({ required: true, enum: Object.values(CouponStatus), default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Prop({ default: true })
  isActive: boolean;

  // Tracking
  @Prop({ type: [CouponUsage], default: [] })
  usageHistory: CouponUsage[];

  @Prop({ default: 0 })
  totalUses: number;

  @Prop({ default: 0 })
  totalDiscountGiven: number;

  // Auditoría
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: User;
}

export const SimpleCouponSchema = SchemaFactory.createForClass(SimpleCoupon);

// Índices
SimpleCouponSchema.index({ code: 1 });
SimpleCouponSchema.index({ promotionId: 1 });
SimpleCouponSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
SimpleCouponSchema.index({ isActive: 1 });

