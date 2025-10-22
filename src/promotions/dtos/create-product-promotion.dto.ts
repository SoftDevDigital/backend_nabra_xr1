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
  IsNotEmpty,
  IsMongoId
} from 'class-validator';

export enum ProductPromotionType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y'
}

export class CreateProductPromotionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ProductPromotionType, { message: 'Tipo inválido: percentage, fixed_amount, buy_x_get_y' })
  type: ProductPromotionType;

  @IsArray()
  @IsMongoId({ each: true, message: 'IDs de productos inválidos' })
  @IsNotEmpty({ message: 'Debe especificar al menos un producto' })
  productIds: string[];

  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startDate: string;

  @IsDateString({}, { message: 'Fecha de fin inválida' })
  endDate: string;

  // ===== CAMPOS SEGÚN TIPO =====

  // Para percentage
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercentage?: number;

  // Para fixed_amount
  @IsOptional()
  @IsNumber()
  @Min(1)
  discountAmount?: number;

  // Para buy_x_get_y
  @IsOptional()
  @IsNumber()
  @Min(1)
  buyQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  getQuantity?: number;

  // ===== CAMPOS OPCIONALES =====

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
