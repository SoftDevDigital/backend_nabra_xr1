import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @Prop({ type: Object })
  address?: {
    street: string;
    city: string;
    zip: string;
    country: string;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }); // Índice único para búsquedas rápidas por email
