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
    // Si ya es array, devolverlo
    if (Array.isArray(value)) {
      return value;
    }
    // Si es string CSV, convertirlo a array
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

  @IsString()
  @IsOptional()
  stockBySizes: string;

  @IsOptional()
  stockBySize: { [size: string]: number };

  @Transform(({ value }) => {
    // Si ya es boolean (JSON), devolverlo
    if (typeof value === 'boolean') {
      return value;
    }
    // Si es string (multipart), convertir
    return value === 'true';
  })
  @IsBoolean()
  @IsOptional()
  isPreorder: boolean;

  @Transform(({ value }) => {
    // Si ya es boolean (JSON), devolverlo
    if (typeof value === 'boolean') {
      return value;
    }
    // Si es string (multipart), convertir
    return value === 'true';
  })
  @IsBoolean()
  @IsOptional()
  isFeatured: boolean;
}
