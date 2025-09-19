import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsString,
  IsEnum,
  IsObject,
} from 'class-validator';

export class CreateOrderDto {
  @IsArray()
  items: { productId: string; quantity: number; size: string; price: number }[];

  @IsMongoId()
  cartId: string;

  @IsNumber()
  total: number;

  @IsObject()
  shippingAddress: {
    street: string;
    city: string;
    zip: string;
    country: string;
  };
}
