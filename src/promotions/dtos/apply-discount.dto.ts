import { IsString, IsOptional, IsArray, ValidateNested, IsMongoId, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CartItemForDiscountDto {
  @ApiProperty({ description: 'ID del producto', example: '64f1c2ab9f1b2a6c0e7a1234' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'ID del item en el carrito', example: '6501b5f2c9b1a2d34f0a1234' })
  @IsMongoId()
  cartItemId: string;

  @ApiProperty({ description: 'Nombre del producto', example: 'Remera Unisex' })
  @IsString()
  productName: string;

  @ApiProperty({ description: 'Categoría del producto', example: 'indumentaria' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Cantidad', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario', example: 3999.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  size?: string;
}

export class ApplyDiscountDto {
  @ApiProperty({ description: 'Código de cupón', required: false, example: 'BIENVENIDA10' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ description: 'Items del carrito', type: [CartItemForDiscountDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemForDiscountDto)
  cartItems: CartItemForDiscountDto[];

  @ApiProperty({ description: 'Monto total del carrito', example: 12999.99 })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ description: 'Zona de envío', required: false, example: 'CABA' })
  @IsOptional()
  @IsString()
  shippingZone?: string;

  @ApiProperty({ description: 'Método de pago', required: false, example: 'mercadopago' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class DiscountResult {
  @ApiProperty({ description: 'Si el cálculo fue exitoso', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Promociones aplicadas',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        promotionId: { type: 'string', example: 'promo_123' },
        promotionName: { type: 'string', example: '10% en indumentaria' },
        type: { type: 'string', example: 'percentage' },
        discountAmount: { type: 'number', example: 1299.9 },
        discountPercentage: { type: 'number', example: 10 },
        couponCode: { type: 'string', example: 'BIENVENIDA10' },
        description: { type: 'string', example: 'Descuento aplicado por cupón' },
      },
    },
  })
  appliedPromotions: Array<{
    promotionId: string;
    promotionName: string;
    type: string;
    discountAmount: number;
    discountPercentage?: number;
    couponCode?: string;
    description: string;
  }>;

  @ApiProperty({ description: 'Descuento total aplicado', example: 1299.9 })
  totalDiscount: number;
  @ApiProperty({ description: 'Total original', example: 12999.9 })
  originalTotal: number;
  @ApiProperty({ description: 'Total final', example: 11699.99 })
  finalTotal: number;
  @ApiProperty({ description: 'Ahorro', example: 1299.9 })
  savings: number;
  @ApiProperty({ required: false, type: [String], example: [] })
  errors?: string[];
  @ApiProperty({ required: false, type: [String], example: [] })
  warnings?: string[];
}
