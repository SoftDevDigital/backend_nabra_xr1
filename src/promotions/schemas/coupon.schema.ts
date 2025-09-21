import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Promotion } from './promotion.schema';

export enum CouponStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum CouponType {
  SINGLE_USE = 'single_use',
  MULTI_USE = 'multi_use',
  USER_SPECIFIC = 'user_specific',
  PUBLIC = 'public',
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

  @Prop()
  orderTotal: number;
}

@Schema({ timestamps: true })
export class Coupon extends Document {
  @Prop({ required: true, unique: true, uppercase: true, maxlength: 50 })
  code: string;

  @Prop({ required: true, maxlength: 100 })
  name: string;

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop({ required: true, enum: Object.values(CouponType) })
  type: CouponType;

  @Prop({ required: true, enum: Object.values(CouponStatus), default: CouponStatus.ACTIVE })
  status: CouponStatus;

  // Vinculación con promoción
  @Prop({ type: Types.ObjectId, ref: 'Promotion', required: true })
  promotionId: Promotion;

  // Restricciones de uso
  @Prop()
  maxUses?: number; // Máximo número de usos total

  @Prop()
  maxUsesPerUser?: number; // Máximo usos por usuario

  @Prop()
  minimumPurchaseAmount?: number; // Compra mínima requerida

  // Fechas de vigencia
  @Prop({ required: true })
  validFrom: Date;

  @Prop({ required: true })
  validUntil: Date;

  // Usuario específico (para cupones personalizados)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  specificUserId?: User;

  // Tracking de uso
  @Prop({ type: [CouponUsage], default: [] })
  usageHistory: CouponUsage[];

  @Prop({ default: 0 })
  totalUses: number;

  @Prop({ default: 0 })
  totalDiscountGiven: number;

  // Configuración
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPublic: boolean; // Visible en listados públicos

  @Prop({ default: false })
  requiresMinimumItems?: boolean; // Requiere mínimo de items en carrito

  @Prop()
  minimumItems?: number;

  // Información adicional
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: User;

  @Prop()
  internalNotes?: string;

  // Métricas
  @Prop({ default: 0 })
  viewCount: number; // Cuántas veces se consultó

  @Prop({ default: 0 })
  attemptCount: number; // Cuántas veces se intentó usar

  @Prop({ default: 0 })
  successCount: number; // Cuántas veces se usó exitosamente

  @Prop({ default: 0 })
  failureCount: number; // Cuántas veces falló la aplicación

  // Información de la última modificación
  @Prop()
  lastUsedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastUsedBy?: User;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

// Índices para búsquedas eficientes
CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ status: 1, isActive: 1 });
CouponSchema.index({ validFrom: 1, validUntil: 1 });
CouponSchema.index({ promotionId: 1 });
CouponSchema.index({ specificUserId: 1 });
CouponSchema.index({ type: 1 });
CouponSchema.index({ createdAt: -1 });
