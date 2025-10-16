import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  category: string; // e.g., "sandalias", "zapatillas", "botas", "plataformas"

  @Prop({ type: [String], default: [] })
  sizes: string[]; // e.g., ["35", "36", "37"]

  @Prop({ type: [String], default: [] })
  images: string[]; // URLs de imágenes

  @Prop({ type: Object, required: true })
  stockBySize: { [size: string]: number }; // e.g., { "35": 10, "36": 20, "37": 15 }

  @Prop({ default: false })
  isPreorder: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ type: Object, default: {} })
  reviewStats?: {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ category: 1, price: 1 }); // Índices para filtros
ProductSchema.index({ name: 'text', description: 'text' }); // Índice para búsqueda de texto
