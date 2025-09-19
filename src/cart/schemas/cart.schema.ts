import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Product } from '../../products/schemas/product.schema';

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({
    type: [
      {
        _id: Types.ObjectId,
        product: { type: Types.ObjectId, ref: 'Product' },
        quantity: Number,
        size: { type: String, required: false },
      },
    ],
    default: [],
  })
  items: {
    _id: Types.ObjectId;
    product: Types.ObjectId;
    quantity: number;
    size?: string;
  }[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ userId: 1 }); // Índice para búsquedas por usuario
