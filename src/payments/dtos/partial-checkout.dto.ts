import { IsArray, IsMongoId, IsInt, Min, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class PartialCartItemDto {
  @IsMongoId()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class PartialCheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartialCartItemDto)
  items: PartialCartItemDto[];

  @IsOptional()
  returnUrl?: string;

  @IsOptional()
  cancelUrl?: string;
}
