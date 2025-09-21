import { IsOptional, IsInt, Min, Max, IsEnum, IsString, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewStatus } from '../schemas/review.schema';

export enum ReviewSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  HIGHEST_RATING = 'highest_rating',
  LOWEST_RATING = 'lowest_rating',
  MOST_HELPFUL = 'most_helpful',
  VERIFIED_ONLY = 'verified_only',
}

export class ReviewQueryDto {
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @IsOptional()
  @IsEnum(ReviewSortBy)
  sortBy?: ReviewSortBy;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  verifiedOnly?: boolean;

  @IsOptional()
  withPhotos?: boolean;
}
