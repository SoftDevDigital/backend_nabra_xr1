import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';
import { User } from '../../auth/schemas/user.schema';

export enum PromotionType {
  PERCENTAGE = 'percentage', // Descuento porcentual
  FIXED_AMOUNT = 'fixed_amount', // Descuento monto fijo
  FREE_SHIPPING = 'free_shipping', // Envío gratis
  BUY_X_GET_Y = 'buy_x_get_y', // Compra X lleva Y
  QUANTITY_DISCOUNT = 'quantity_discount', // Descuento por cantidad
  CATEGORY_DISCOUNT = 'category_discount', // Descuento por categoría
  MINIMUM_PURCHASE = 'minimum_purchase', // Descuento por compra mínima
  FLASH_SALE = 'flash_sale', // Oferta relámpago
}

export enum PromotionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PromotionTarget {
  ALL_PRODUCTS = 'all_products',
  SPECIFIC_PRODUCTS = 'specific_products',
  CATEGORY = 'category',
  USER_SEGMENT = 'user_segment',
  FIRST_TIME_BUYERS = 'first_time_buyers',
  RETURNING_CUSTOMERS = 'returning_customers',
}

@Schema({ _id: false })
export class PromotionConditions {
  @Prop()
  minimumPurchaseAmount?: number;

  @Prop()
  minimumQuantity?: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }] })
  specificProducts?: Product[];

  @Prop({ type: [String] })
  categories?: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  specificUsers?: User[];

  @Prop()
  userSegment?: string; // 'new', 'vip', 'inactive', etc.

  @Prop()
  maxUsesPerUser?: number;

  @Prop()
  maxTotalUses?: number;

  @Prop()
  excludeDiscountedItems?: boolean;

  @Prop({ type: [String] })
  allowedPaymentMethods?: string[];

  @Prop({ type: [String] })
  allowedShippingZones?: string[]; // 'CABA', 'GBA', 'INTERIOR'
}

@Schema({ _id: false })
export class PromotionRules {
  // Para descuentos porcentuales
  @Prop()
  discountPercentage?: number; // 0-100

  // Para descuentos de monto fijo
  @Prop()
  discountAmount?: number;

  // Para ofertas buy X get Y
  @Prop()
  buyQuantity?: number;

  @Prop()
  getQuantity?: number;

  @Prop()
  getDiscountPercentage?: number; // Descuento en los items "get"

  // Para descuentos por cantidad
  @Prop({ type: [{ 
    quantity: Number, 
    discount: Number,
    discountType: { type: String, enum: ['percentage', 'fixed'] }
  }] })
  quantityTiers?: Array<{
    quantity: number;
    discount: number;
    discountType: 'percentage' | 'fixed';
  }>;

  // Límites
  @Prop()
  maxDiscountAmount?: number; // Límite máximo de descuento

  @Prop()
  minDiscountAmount?: number; // Descuento mínimo para aplicar
}

@Schema({ _id: false })
export class PromotionUsage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  usedAt: Date;

  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  discountAmount: number;

  @Prop()
  orderTotal?: number;

  @Prop()
  couponCode?: string;
}

@Schema({ timestamps: true })
export class Promotion extends Document {
  @Prop({ required: true, maxlength: 100 })
  name: string;

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop({ required: true, enum: Object.values(PromotionType) })
  type: PromotionType;

  @Prop({ required: true, enum: Object.values(PromotionStatus), default: PromotionStatus.DRAFT })
  status: PromotionStatus;

  @Prop({ required: true, enum: Object.values(PromotionTarget) })
  target: PromotionTarget;

  // Fechas de vigencia
  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  // Condiciones de aplicación
  @Prop({ required: true, type: PromotionConditions })
  conditions: PromotionConditions;

  // Reglas de descuento
  @Prop({ required: true, type: PromotionRules })
  rules: PromotionRules;

  // Tracking de uso
  @Prop({ type: [PromotionUsage], default: [] })
  usageHistory: PromotionUsage[];

  @Prop({ default: 0 })
  totalUses: number;

  @Prop({ default: 0 })
  totalDiscountGiven: number;

  // Configuración
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isAutomatic: boolean; // Se aplica automáticamente sin código

  @Prop({ default: 1 })
  priority: number; // Para resolver conflictos entre promociones

  // Información adicional
  @Prop({ maxlength: 50 })
  internalNotes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: User;

  @Prop()
  lastModifiedBy?: User;

  // Métricas
  @Prop({ default: 0 })
  viewCount: number; // Cuántas veces se vio la promoción

  @Prop({ default: 0 })
  clickCount: number; // Cuántas veces se intentó usar

  @Prop({ default: 0 })
  conversionCount: number; // Cuántas veces se usó exitosamente
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

// Índices para búsquedas eficientes
PromotionSchema.index({ status: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ type: 1, target: 1 });
PromotionSchema.index({ 'conditions.categories': 1 });
PromotionSchema.index({ 'conditions.specificProducts': 1 });
PromotionSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
PromotionSchema.index({ priority: -1 });
PromotionSchema.index({ createdAt: -1 });
