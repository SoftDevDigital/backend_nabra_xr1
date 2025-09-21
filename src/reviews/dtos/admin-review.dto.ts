import { IsEnum, IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';
import { ReviewStatus, ReviewFlag } from '../schemas/review.schema';

export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderationReason?: string;
}

export class AdminResponseDto {
  @IsString()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class FlagReviewDto {
  @IsEnum(ReviewFlag)
  flag: ReviewFlag;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class ReviewHelpfulnessDto {
  @IsBoolean()
  isHelpful: boolean;
}
