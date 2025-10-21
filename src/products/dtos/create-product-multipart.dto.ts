import {
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductMultipartDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  price: number;

  @IsString()
  category: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  sizes: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images: string[];

  @IsOptional()
  stockBySize: { [size: string]: number };

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  isPreorder: boolean;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  isFeatured: boolean;
}
