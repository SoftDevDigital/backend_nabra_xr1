import { 
  IsMongoId, 
  IsInt, 
  Min, 
  Max, 
  IsString, 
  MaxLength, 
  IsOptional, 
  IsArray, 
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewPhotoDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}

export class CreateReviewDto {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  orderId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewPhotoDto)
  photos?: ReviewPhotoDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchaseVariant?: string; // Talla, color, etc.
}
