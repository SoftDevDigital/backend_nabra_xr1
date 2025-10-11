import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  zip: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  name?: string; // Nombre del destinatario

  @IsString()
  @IsOptional()
  phone?: string; // Teléfono del destinatario
}

