import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  IsDateString, 
  IsArray,
  IsEnum,
  Min, 
  Max,
  IsNotEmpty
} from 'class-validator';

export enum SimplePromotionType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y',
  FREE_SHIPPING = 'free_shipping'
}

export enum SimplePromotionTarget {
  ALL_PRODUCTS = 'all_products',
  SPECIFIC_PRODUCTS = 'specific_products',
  CATEGORY = 'category'
}

export class CreateSimplePromotionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la promoción es requerido' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SimplePromotionType, { message: 'Tipo de promoción inválido. Opciones válidas: percentage, fixed_amount, buy_x_get_y, free_shipping' })
  type: SimplePromotionType;

  @IsEnum(SimplePromotionTarget, { message: 'Objetivo de promoción inválido. Opciones válidas: all_products, specific_products, category' })
  target: SimplePromotionTarget;

  @IsDateString({}, { message: 'Fecha de inicio inválida. Formato: YYYY-MM-DDTHH:mm:ss.sssZ' })
  startDate: string;

  @IsDateString({}, { message: 'Fecha de fin inválida. Formato: YYYY-MM-DDTHH:mm:ss.sssZ' })
  endDate: string;

  // Reglas simples según el tipo
  @IsOptional()
  @IsNumber({}, { message: 'El porcentaje de descuento debe ser un número' })
  @Min(1, { message: 'El porcentaje de descuento debe ser mayor a 0' })
  @Max(100, { message: 'El porcentaje de descuento no puede ser mayor a 100' })
  discountPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El monto de descuento debe ser un número' })
  @Min(1, { message: 'El monto de descuento debe ser mayor a 0' })
  discountAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad de compra debe ser un número' })
  @Min(1, { message: 'La cantidad de compra debe ser mayor a 0' })
  buyQuantity?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad gratis debe ser un número' })
  @Min(1, { message: 'La cantidad gratis debe ser mayor a 0' })
  getQuantity?: number;

  // Condiciones
  @IsOptional()
  @IsArray({ message: 'Los productos específicos deben ser un array' })
  @IsString({ each: true, message: 'Cada ID de producto debe ser una cadena válida' })
  specificProducts?: string[];

  @IsOptional()
  @IsString({ message: 'La categoría debe ser una cadena' })
  category?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El monto mínimo de compra debe ser un número' })
  @Min(0, { message: 'El monto mínimo de compra no puede ser negativo' })
  minimumPurchaseAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad mínima debe ser un número' })
  @Min(1, { message: 'La cantidad mínima debe ser mayor a 0' })
  minimumQuantity?: number;

  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isAutomatic debe ser verdadero o falso' })
  isAutomatic?: boolean;
}

export class ApplyPromotionDto {
  @IsString()
  @IsNotEmpty({ message: 'El código de cupón es requerido' })
  couponCode?: string;

  @IsArray({ message: 'Los items del carrito deben ser un array' })
  cartItems: Array<{
    productId: string;
    cartItemId?: string;
    productName: string;
    category: string;
    quantity: number;
    price: number;
    size?: string;
  }>;

  @IsNumber({}, { message: 'El monto total debe ser un número' })
  @Min(0, { message: 'El monto total no puede ser negativo' })
  totalAmount: number;
}

export class CreateSimpleCouponDto {
  @IsString()
  @IsNotEmpty({ message: 'El código del cupón es requerido' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID de la promoción es requerido' })
  promotionId: string;

  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  validFrom: string;

  @IsDateString({}, { message: 'Fecha de fin inválida' })
  validUntil: string;

  @IsOptional()
  @IsNumber({}, { message: 'El monto mínimo debe ser un número' })
  @Min(0, { message: 'El monto mínimo no puede ser negativo' })
  minimumPurchaseAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El máximo de usos debe ser un número' })
  @Min(1, { message: 'El máximo de usos debe ser mayor a 0' })
  maxUses?: number;
}

