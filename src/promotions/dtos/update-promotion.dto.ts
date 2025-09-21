import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePromotionDto } from './create-promotion.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { PromotionStatus } from '../schemas/promotion.schema';

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;
}

export class UpdateCouponDto extends PartialType(CreatePromotionDto) {}
