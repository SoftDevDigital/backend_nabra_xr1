import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateReviewDto } from './create-review.dto';

export class UpdateReviewDto extends PartialType(
  OmitType(CreateReviewDto, ['productId', 'orderId'] as const)
) {}
