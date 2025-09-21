import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  IsDateString, 
  IsEnum, 
  Min, 
  MaxLength,
  IsMongoId,
  Matches 
} from 'class-validator';
import { CouponType } from '../schemas/coupon.schema';

export class CreateCouponDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9]+$/, { message: 'Coupon code must contain only uppercase letters and numbers' })
  code: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(CouponType)
  type: CouponType;

  @IsMongoId()
  promotionId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsesPerUser?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPurchaseAmount?: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsMongoId()
  specificUserId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresMinimumItems?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumItems?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  internalNotes?: string;
}
