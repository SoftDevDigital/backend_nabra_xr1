import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

export type PaymentDocument = Payment & Document;

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum PaymentProvider {
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  MERCADOPAGO = 'mercadopago',
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: String, enum: PaymentProvider, required: true })
  provider: PaymentProvider;

  @Prop({ required: true })
  providerPaymentId: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  orderId?: Types.ObjectId;

  @Prop({ type: Object })
  items: {
    name: string;
    description?: string;
    quantity: number;
    price: number;
    currency?: string;
  }[];

  @Prop()
  approvalUrl?: string;

  @Prop()
  captureId?: string;

  @Prop()
  payerId?: string;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ providerPaymentId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });



