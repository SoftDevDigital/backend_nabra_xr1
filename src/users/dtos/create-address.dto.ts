import { IsEnum, IsString, IsOptional, IsBoolean, MaxLength, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressType } from '../schemas/address.schema';

export class CoordinatesDto {
  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;
}

export class DrEnvioDataDto {
  @IsOptional()
  @IsString()
  deliveryZone?: string;

  @IsOptional()
  @IsString()
  estimatedDeliveryTime?: string;

  @IsOptional()
  shippingCost?: number;

  @IsOptional()
  restrictions?: string[];
}

export class CreateAddressDto {
  @IsEnum(AddressType)
  type: AddressType;

  @IsString()
  @MaxLength(100)
  alias: string;

  @IsString()
  @MaxLength(200)
  street: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apartment?: string;

  @IsString()
  @MaxLength(100)
  neighborhood: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  state: string;

  @IsString()
  @MaxLength(20)
  postalCode: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  references?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  receiverPhone?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DrEnvioDataDto)
  drEnvioData?: DrEnvioDataDto;
}
