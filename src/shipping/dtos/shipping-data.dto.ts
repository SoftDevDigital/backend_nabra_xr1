import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsEnum, IsInt, Min, Max, MaxLength, Matches, IsEmail, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingAddressDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MaxLength(200)
  street: string;

  @IsString()
  @MaxLength(20)
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  int_number?: string;

  @IsString()
  @MaxLength(100)
  district: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @Matches(/^MX$/, { message: 'Country must be MX for Mexico' })
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @IsString()
  @MaxLength(10)
  state: string;

  @IsString()
  @Matches(/^\d{5}$/, { message: 'Postal code must be exactly 5 digits' })
  postal_code: string;
}

export class ShipmentDataDto {
  @IsString()
  @MaxLength(50)
  carrier: string;

  @IsString()
  @MaxLength(50)
  ObjectId: string;

  @IsString()
  @MaxLength(50)
  ShippingId: string;

  @IsString()
  @MaxLength(50)
  service: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @MaxLength(500)
  contentExplanation: string;

  @IsInt()
  @Min(1)
  contentQuantity: number;

  @IsString()
  @MaxLength(20)
  satContent: string;
}

export class PackageDto {
  @IsNumber()
  @Min(0.1)
  @Max(150) // Máximo 150cm según DrEnvío
  width: number;

  @IsNumber()
  @Min(0.1)
  @Max(150) // Máximo 150cm según DrEnvío
  height: number;

  @IsNumber()
  @Min(0.1)
  @Max(150) // Máximo 150cm según DrEnvío
  length: number;

  @IsNumber()
  @Min(0.1)
  @Max(50) // Máximo 50kg según DrEnvío
  weight: number;

  @IsEnum(['box', 'envelope', 'pallet'])
  type: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  declared_value?: number;

  @IsInt()
  @Min(1)
  contentQuantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumetric?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  main_weight?: number;
}

export class ShippingDataCaptureDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  origin: ShippingAddressDto;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  destination: ShippingAddressDto;

  @ValidateNested()
  @Type(() => ShipmentDataDto)
  shipment: ShipmentDataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDto)
  packages: PackageDto[];

  @IsString()
  @MaxLength(50)
  service_id: string;

  @IsNumber()
  @Min(0)
  insurance: number;

  @IsArray()
  @IsString({ each: true })
  carriers: string[];
}

export class ShippingCalculationResponseDto {
  @IsNumber()
  @Min(0)
  cartTotal: number;

  @IsNumber()
  @Min(0)
  shippingCost: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsString()
  currency: string;

  @ValidateNested()
  @Type(() => ShippingDataCaptureDto)
  shippingData: ShippingDataCaptureDto;
}

export class CreateShipmentDto {
  @IsString()
  orderId: string;

  @ValidateNested()
  @Type(() => ShippingDataCaptureDto)
  shippingData: ShippingDataCaptureDto;
}
