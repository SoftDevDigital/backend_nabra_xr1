import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Media extends Document {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true, enum: ['product', 'cover'] })
  type: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ default: false })
  active: boolean; // Added for cover image activation
}

export const MediaSchema = SchemaFactory.createForClass(Media);
MediaSchema.index({ type: 1, createdAt: -1 });
