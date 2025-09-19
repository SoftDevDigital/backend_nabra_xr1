import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsString,
  IsEnum,
  IsObject,
} from 'class-validator';

export class CheckoutPartialDto {
  @IsArray()
  items: { itemId: string; quantity: number }[]; // itemId del carrito, cantidad ajustada (menor o igual a original)

  @IsMongoId()
  cartId: string;

  @IsObject()
  shippingAddress: {
    street: string;
    city: string;
    zip: string;
    country: string;
  };
}
