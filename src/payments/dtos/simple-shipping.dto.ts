import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SimpleShippingContactDto {
  @IsOptional()
  @IsString()
  emailOrPhone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class SimpleShippingAddressDto {
  @IsString()
  country: string;

  @IsString()
  state: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;

  @IsString()
  addressLine: string;
}

export class SimpleShippingDto {
  @ValidateNested()
  @Type(() => SimpleShippingContactDto)
  contact: SimpleShippingContactDto;

  @ValidateNested()
  @Type(() => SimpleShippingAddressDto)
  address: SimpleShippingAddressDto;
}


