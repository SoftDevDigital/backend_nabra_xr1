import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Product } from '../../products/schemas/product.schema';
import { Order } from '../../orders/schemas/order.schema';

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

export enum ReviewFlag {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  FAKE = 'fake',
  OFFENSIVE = 'offensive',
  OTHER = 'other',
}

@Schema({ _id: false })
export class ReviewPhoto {
  @Prop({ required: true })
  url: string;

  @Prop({ maxlength: 200 })
  caption?: string;

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop({ default: false })
  isApproved: boolean;
}

@Schema({ _id: false })
export class ReviewModerationInfo {
  @Prop({ default: Date.now })
  moderatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  moderatedBy?: User;

  @Prop({ maxlength: 500 })
  moderationReason?: string;

  @Prop({ default: 0 })
  autoModerationScore: number; // 0-100, donde 100 es más sospechoso

  @Prop({ type: [String] })
  detectedIssues?: string[]; // ['spam_keywords', 'fake_review', etc.]
}

@Schema({ _id: false })
export class ReviewResponse {
  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  respondedBy: User;

  @Prop({ default: Date.now })
  respondedAt: Date;

  @Prop({ default: true })
  isVisible: boolean;
}

@Schema({ _id: false })
export class ReviewHelpfulness {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  isHelpful: boolean; // true = útil, false = no útil

  @Prop({ default: Date.now })
  votedAt: Date;
}

@Schema({ timestamps: true })
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Product;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Order; // Verificación de compra

  // Contenido de la reseña
  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, maxlength: 100 })
  title: string;

  @Prop({ required: true, maxlength: 2000 })
  content: string;

  @Prop({ type: [ReviewPhoto], default: [] })
  photos: ReviewPhoto[];

  // Estado y moderación
  @Prop({ required: true, enum: Object.values(ReviewStatus), default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @Prop({ type: ReviewModerationInfo })
  moderationInfo?: ReviewModerationInfo;

  // Interacciones
  @Prop({ type: [ReviewHelpfulness], default: [] })
  helpfulnessVotes: ReviewHelpfulness[];

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ default: 0 })
  notHelpfulCount: number;

  @Prop({ default: 0 })
  reportCount: number;

  // Respuesta del vendedor/admin
  @Prop({ type: ReviewResponse })
  adminResponse?: ReviewResponse;

  // Información adicional
  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ default: false })
  isVerifiedPurchase: boolean;

  @Prop({ default: false })
  isFeatured: boolean; // Para destacar reseñas importantes

  @Prop()
  purchaseDate?: Date; // Fecha de compra del producto

  @Prop({ maxlength: 50 })
  purchaseVariant?: string; // Talla, color, etc. comprado

  // Métricas de calidad
  @Prop({ default: 0 })
  qualityScore: number; // 0-100, calculado automáticamente

  @Prop({ default: 0 })
  viewCount: number;

  @Prop()
  lastViewedAt?: Date;

  // Flags y reportes
  @Prop({ type: [{ 
    userId: { type: Types.ObjectId, ref: 'User' },
    flag: { type: String, enum: Object.values(ReviewFlag) },
    reason: String,
    reportedAt: { type: Date, default: Date.now }
  }], default: [] })
  flags: Array<{
    userId: User;
    flag: ReviewFlag;
    reason?: string;
    reportedAt: Date;
  }>;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Índices para búsquedas eficientes
ReviewSchema.index({ productId: 1, status: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ orderId: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ status: 1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ helpfulCount: -1 });
ReviewSchema.index({ qualityScore: -1 });
ReviewSchema.index({ isVerifiedPurchase: 1 });
ReviewSchema.index({ isFeatured: 1 });

// Índice compuesto para evitar reseñas duplicadas
ReviewSchema.index({ productId: 1, userId: 1, orderId: 1 }, { unique: true });

// Índice de texto para búsquedas
ReviewSchema.index({ title: 'text', content: 'text' });
