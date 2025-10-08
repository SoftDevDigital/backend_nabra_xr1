import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingDataCaptureDto } from '../../shipping/dtos/shipping-data.dto';
import { SimpleShippingDto } from './simple-shipping.dto';
import { ShippingOptionDto } from './shipping-option.dto';

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
}
