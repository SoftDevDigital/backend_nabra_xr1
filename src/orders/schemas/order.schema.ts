import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Product } from '../../products/schemas/product.schema';
import { Cart } from '../../cart/schemas/cart.schema';

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({
    type: [
      {
        product: { type: Types.ObjectId, ref: 'Product' },
        quantity: Number,
        size: String,
        price: Number,
      },
    ],
    required: true,
  })
  items: { product: Product; quantity: number; size: string; price: number }[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: Types.ObjectId, ref: 'Cart', required: true })
  cartId: Cart;

  @Prop({ required: true })
  total: number;

  @Prop({
    required: true,
    enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Object, required: true })
  shippingAddress: {
    street: string;
    city: string;
    zip: string;
    country: string;
  };
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, status: 1 }); // Índices para búsquedas por usuario y estado
