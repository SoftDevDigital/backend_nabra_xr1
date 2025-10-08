import { IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingDataCaptureDto } from '../../shipping/dtos/shipping-data.dto';

export class PaymentWithShippingDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDataCaptureDto)
  shippingData?: ShippingDataCaptureDto;

  @IsOptional()
  @IsNumber()
  shippingCost?: number;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
