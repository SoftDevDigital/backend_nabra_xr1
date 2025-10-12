import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SimpleShippingDto } from './simple-shipping.dto';
import { ShippingOptionDto } from './shipping-option.dto';

export class MercadoPagoCheckoutDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleShippingDto)
  simpleShipping?: SimpleShippingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingOptionDto)
  shippingOption?: ShippingOptionDto;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}

