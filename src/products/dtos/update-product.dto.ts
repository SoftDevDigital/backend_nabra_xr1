import {
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  stockBySize?: { [size: string]: number };

  @IsOptional()
  @IsBoolean()
  isPreorder?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
