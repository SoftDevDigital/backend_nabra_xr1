import { 
  IsEnum, 
  IsString, 
  IsNumber, 
  IsArray, 
  IsOptional, 
  IsBoolean, 
  IsDateString, 
  ValidateNested, 
  Min, 
  Max, 
  MaxLength,
  IsMongoId,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromotionType, PromotionTarget } from '../schemas/promotion.schema';

export class PromotionConditionsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumQuantity?: number;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  specificProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  specificUsers?: string[];

  @IsOptional()
  @IsString()
  userSegment?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsesPerUser?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTotalUses?: number;

  @IsOptional()
  @IsBoolean()
  excludeDiscountedItems?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedPaymentMethods?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedShippingZones?: string[];
}

export class QuantityTierDto {
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  discount: number;

  @IsEnum(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';
}

export class ProgressiveTierDto {
  @IsNumber()
  @Min(1)
  position: number; // 1 = primer item, 2 = segundo item, etc.

  @IsNumber()
  @Min(0)
  discount: number;

  @IsEnum(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';
}

export class BundleItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  requiredQuantity: number;

  @IsNumber()
  @Min(0)
  discount: number;

  @IsEnum(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';
}

export class GiftItemDto {
  @IsString()
  @IsNotEmpty()
  giftProductId: string;

  @IsNumber()
  @Min(1)
  giftQuantity: number;

  @IsNumber()
  @Min(0)
  minimumPurchaseAmount: number;
}

export class TimeSlotDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0-6 (domingo a sábado)

  @IsNumber()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsNumber()
  @Min(0)
  @Max(23)
  endHour: number;

  @IsNumber()
  @Min(0)
  discount: number;

  @IsEnum(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';
}

export class PromotionRulesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  buyQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  getQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  getDiscountPercentage?: number;

  // Para PAY_X_GET_Y
  @IsOptional()
  @IsNumber()
  @Min(1)
  payQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  getTotalQuantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuantityTierDto)
  quantityTiers?: QuantityTierDto[];

  // Para descuentos progresivos
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgressiveTierDto)
  progressiveTiers?: ProgressiveTierDto[];

  // Para bundles
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  bundleItems?: BundleItemDto[];

  // Para regalos
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GiftItemDto)
  giftItems?: GiftItemDto[];

  // Para descuentos por tiempo
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];

  // Para fidelidad
  @IsOptional()
  @IsString()
  loyaltyLevel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPurchaseHistory?: number;

  // Para cumpleaños
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  birthdayDiscountDays?: number;

  // Para liquidación
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockThreshold?: number;

  @IsOptional()
  @IsString()
  urgencyLevel?: string;

  // Para estacional
  @IsOptional()
  @IsString()
  season?: string;

  @IsOptional()
  @IsString()
  holiday?: string;

  // Límites
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsesPerDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsesPerUser?: number;
}

export class CreatePromotionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @IsEnum(PromotionTarget)
  target: PromotionTarget;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @ValidateNested()
  @Type(() => PromotionConditionsDto)
  conditions: PromotionConditionsDto;

  @ValidateNested()
  @Type(() => PromotionRulesDto)
  rules: PromotionRulesDto;

  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  // Sistema automático de aplicación a carrito
  @IsOptional()
  @IsBoolean()
  autoApplyToCart?: boolean;

  @IsOptional()
  @IsBoolean()
  retroactiveApplication?: boolean;

  @IsOptional()
  @IsBoolean()
  realTimeUpdate?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCartUsers?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  internalNotes?: string;
}
