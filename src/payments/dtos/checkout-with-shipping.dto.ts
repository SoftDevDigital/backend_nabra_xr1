import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingDataCaptureDto } from '../../shipping/dtos/shipping-data.dto';
import { SimpleShippingDto } from './simple-shipping.dto';
import { ShippingOptionDto } from './shipping-option.dto';
import { ShippingAddressDto } from './shipping-address.dto';

class ShippingContactDto {
  @IsOptional()
  email?: string;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  phone?: string;
}

export class CheckoutWithShippingDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDataCaptureDto)
  shippingData?: ShippingDataCaptureDto;

  // Forma simple alternativa { contact, address }
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleShippingDto)
  simpleShipping?: SimpleShippingDto;

  // Información de la opción de envío seleccionada
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingOptionDto)
  shippingOption?: ShippingOptionDto;

  // Dirección de envío (convertida desde simpleShipping para compatibilidad)
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  // Contacto de envío (convertido desde simpleShipping para compatibilidad)
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingContactDto)
  shippingContact?: ShippingContactDto;
}
