import { IsString, IsNotEmpty, IsNumber, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// Contact info
class ContactDto {
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

// Address info
class AddressDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  addressLine: string;
}

// Simple Shipping
class SimpleShippingDto {
  @ValidateNested()
  @Type(() => ContactDto)
  contact: ContactDto;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

// Shipping Option
class ShippingOptionDto {
  @IsString()
  @IsOptional()
  ObjectId?: string;

  @IsString()
  @IsOptional()
  ShippingId?: string;

  @IsString()
  @IsNotEmpty()
  carrier: string;

  @IsString()
  @IsNotEmpty()
  service: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsOptional()
  insurance?: number;

  @IsString()
  @IsOptional()
  service_id?: string;

  @IsString()
  @IsOptional()
  days?: string;
}

// Main DTO (TODO ES OPCIONAL)
export class MercadoPagoCheckoutDto {
  @ValidateNested()
  @Type(() => SimpleShippingDto)
  @IsOptional()
  simpleShipping?: SimpleShippingDto;

  @ValidateNested()
  @Type(() => ShippingOptionDto)
  @IsOptional()
  shippingOption?: ShippingOptionDto;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}

