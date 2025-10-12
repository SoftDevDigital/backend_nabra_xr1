import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Product } from '../../products/schemas/product.schema';
import { Cart } from '../../cart/schemas/cart.schema';

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ unique: true, required: true })
  orderNumber: string; // Código único de orden (ej: ORD-2025-001234)

  @Prop({
    type: [
      {
        product: { type: Types.ObjectId, ref: 'Product' },
        quantity: Number,
        size: String,
        price: Number,
        productName: String, // Nombre del producto por si no se encuentra la referencia
        // Snapshot del producto al momento de la compra
        productSnapshot: {
          name: String,
          description: String,
          price: Number,
          images: [String],
          category: String,
          brand: String,
          sku: String,
        },
        // Información de stock
        reservedStock: { type: Number, default: 0 },
        stockReleased: { type: Boolean, default: false },
      },
    ],
    required: true,
  })
  items: { 
    product: Product; 
    quantity: number; 
    size: string; 
    price: number; 
    productName?: string;
    productSnapshot?: {
      name: string;
      description: string;
      price: number;
      images: string[];
      category: string;
      brand: string;
      sku: string;
    };
    reservedStock: number;
    stockReleased: boolean;
  }[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: Types.ObjectId, ref: 'Cart', required: false })
  cartId: Cart;

  @Prop({ required: true })
  total: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ type: String, required: false })
  paymentId: string; // ID del pago asociado

  @Prop({
    required: true,
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Object, required: false })
  shippingAddress?: {
    street: string;
    city: string;
    zip: string;
    country: string;
    state?: string;
    postal_code?: string;
    contact?: {
      name: string;
      phone: string;
      email: string;
    };
  };

  @Prop({ type: Number, default: 0 })
  shippingCost: number;

  @Prop({ type: Object, required: false })
  shippingInfo?: {
    carrier: string;
    service: string;
    serviceId: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    packages: Array<{
      width: number;
      height: number;
      length: number;
      weight: number;
      type: string;
      name: string;
      content: string;
      declared_value?: number;
      contentQuantity: number;
    }>;
    insurance: number;
    // Información detallada del contacto de envío
    contact?: {
      emailOrPhone?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      name?: string;
    };
    // Dirección completa de envío
    address?: {
      country?: string;
      state?: string;
      city?: string;
      postalCode?: string;
      addressLine?: string;
      addressLine2?: string;
      neighborhood?: string;
      references?: string;
    };
    // Opción de envío seleccionada
    shippingOption?: {
      carrier?: string;
      service?: string;
      serviceName?: string;
      currency?: string;
      price?: number;
      estimatedDays?: number;
      description?: string;
    };
  };

  @Prop({ type: Number, default: 0 })
  subtotal: number;

  @Prop({ type: Number, default: 0 })
  tax: number;

  @Prop({ type: Number, default: 0 })
  discount: number;

  // Información de pago más completa
  @Prop({ type: String, required: false })
  paymentMethod: string; // 'mercadopago', 'paypal', etc.

  @Prop({ type: String, required: false })
  paymentStatus: string; // 'pending', 'approved', 'rejected'

  @Prop({ type: Date, required: false })
  paymentDate: Date;

  // Información de cliente (snapshot)
  @Prop({ type: String, required: false })
  customerEmail: string;

  @Prop({ type: String, required: false })
  customerName: string;

  // Metadatos
  @Prop({ type: String, default: 'web' })
  source: string; // 'web', 'mobile', 'api'

  @Prop({ type: String, required: false })
  notes: string; // Comentarios del cliente

  @Prop({ type: String, default: 'normal' })
  priority: string; // 'normal', 'high', 'urgent'

  // Información de promociones
  @Prop({ type: String, required: false })
  couponCode: string;

  @Prop({ type: Object, required: false })
  appliedPromotions: [{
    code: string;
    type: string;
    discount: number;
    description: string;
  }];
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, status: 1 }); // Índices para búsquedas por usuario y estado
OrderSchema.index({ orderNumber: 1 }); // Índice para búsqueda por número de orden
OrderSchema.index({ paymentId: 1 }); // Índice para búsqueda por ID de pago
