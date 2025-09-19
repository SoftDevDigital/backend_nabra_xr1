import {
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsString()
  category: string;

  @IsArray()
  @IsString({ each: true })
  sizes: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images: string[];

  @IsNumber()
  stock: number;

  @IsBoolean()
  @IsOptional()
  isPreorder: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured: boolean;
}
