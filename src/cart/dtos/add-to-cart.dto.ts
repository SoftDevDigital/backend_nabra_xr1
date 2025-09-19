import { IsMongoId, IsInt, Min, IsString, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsMongoId()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  size?: string;
}
