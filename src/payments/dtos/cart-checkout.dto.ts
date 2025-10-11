import { IsOptional, IsString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingAddressDto } from './shipping-address.dto';

class ShippingContactDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

class ShippingOptionDto {
  @IsString()
  @IsOptional()
  ObjectId?: string;

  @IsString()
  @IsOptional()
  ShippingId?: string;

  @IsString()
  @IsOptional()
  carrier?: string;

  @IsString()
  @IsOptional()
  service?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

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

export class CartCheckoutDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsOptional()
  shippingAddress?: ShippingAddressDto;

  @ValidateNested()
  @Type(() => ShippingContactDto)
  @IsOptional()
  shippingContact?: ShippingContactDto;

  @ValidateNested()
  @Type(() => ShippingOptionDto)
  @IsOptional()
  shippingOption?: ShippingOptionDto;

  @IsString()
  @IsOptional()
  shippingMethod?: string; // 'standard', 'express', 'overnight', etc.

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}


