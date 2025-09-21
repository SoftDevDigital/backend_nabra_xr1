import { IsString, IsOptional, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemForDiscountDto {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  cartItemId: string;

  @IsString()
  productName: string;

  @IsString()
  category: string;

  @IsString()
  quantity: number;

  @IsString()
  price: number;

  @IsOptional()
  @IsString()
  size?: string;
}

export class ApplyDiscountDto {
  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemForDiscountDto)
  cartItems: CartItemForDiscountDto[];

  @IsString()
  totalAmount: number;

  @IsOptional()
  @IsString()
  shippingZone?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class DiscountResult {
  success: boolean;
  appliedPromotions: Array<{
    promotionId: string;
    promotionName: string;
    type: string;
    discountAmount: number;
    discountPercentage?: number;
    couponCode?: string;
    description: string;
  }>;
  totalDiscount: number;
  originalTotal: number;
  finalTotal: number;
  savings: number;
  errors?: string[];
  warnings?: string[];
}
