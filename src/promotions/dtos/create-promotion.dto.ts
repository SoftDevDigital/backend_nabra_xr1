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
  IsMongoId 
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuantityTierDto)
  quantityTiers?: QuantityTierDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDiscountAmount?: number;
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

  @IsOptional()
  @IsString()
  @MaxLength(50)
  internalNotes?: string;
}
