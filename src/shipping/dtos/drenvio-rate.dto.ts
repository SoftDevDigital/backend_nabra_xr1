import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class DrEnvioContactDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  email: string;
}

export class DrEnvioAddressDto {
  @IsString()
  country: string;

  @IsString()
  postal_code: string;

  @IsString()
  state: string;

  @IsString()
  city: string;

  @IsString()
  address: string;

  @ValidateNested()
  @Type(() => DrEnvioContactDto)
  contact: DrEnvioContactDto;
}

export class DrEnvioPackageDto {
  @IsNumber()
  weight: number;

  @IsNumber()
  height: number;

  @IsNumber()
  width: number;

  @IsNumber()
  length: number;

  @IsString()
  type: string;

  @IsNumber()
  main_weight: number;

  @IsNumber()
  volumetric_weight: number;

  @IsString()
  content: string;
}

export class DrEnvioRateRequestDto {
  @IsEnum(['National', 'International'])
  type: 'National' | 'International';

  @ValidateNested()
  @Type(() => DrEnvioAddressDto)
  origin: DrEnvioAddressDto;

  @ValidateNested()
  @Type(() => DrEnvioAddressDto)
  destination: DrEnvioAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrEnvioPackageDto)
  packages: DrEnvioPackageDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  carriers?: string[];

  @IsOptional()
  @IsNumber()
  insurance?: number;
}

export class DrEnvioRateResponseDto {
  @IsString()
  ObjectId: string;

  @IsString()
  ShippingId: string;

  @IsString()
  carrier: string;

  @IsString()
  service: string;

  @IsString()
  service_id: string;

  @IsNumber()
  price: number;

  @IsNumber()
  insurance: number;

  @IsString()
  currency: string;

  @IsString()
  days: string;

  @IsOptional()
  metadata?: any;
}

export class DrEnvioCreateShipmentDto {
  @IsEnum(['National', 'International'])
  type: 'National' | 'International';

  @IsString()
  rate_id: string;

  @IsString()
  service_id: string;

  @ValidateNested()
  @Type(() => DrEnvioAddressDto)
  origin: DrEnvioAddressDto;

  @ValidateNested()
  @Type(() => DrEnvioAddressDto)
  destination: DrEnvioAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrEnvioPackageDto)
  packages: DrEnvioPackageDto[];

  @IsOptional()
  @IsNumber()
  insurance?: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class DrEnvioShipmentResponseDto {
  @IsString()
  id: string;

  @IsString()
  tracking_number: string;

  @IsString()
  carrier: string;

  @IsString()
  service: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  label_url?: string;

  @IsOptional()
  @IsString()
  last_update?: string;
}

export class DrEnvioShipmentStatusDto {
  @IsString()
  id: string;

  @IsString()
  tracking_number: string;

  @IsString()
  carrier: string;

  @IsString()
  service: string;

  @IsString()
  status: string;

  @IsString()
  last_update: string;

  @IsOptional()
  tracking_events?: any[];
}
