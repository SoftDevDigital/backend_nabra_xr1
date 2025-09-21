import { IsString, IsOptional, IsEnum, IsDateString, MaxLength, IsEmail, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType, Gender, PhoneType } from '../schemas/user-profile.schema';

export class PhoneNumberDto {
  @IsString()
  @MaxLength(5)
  countryCode: string;

  @IsString()
  @MaxLength(20)
  number: string;

  @IsEnum(PhoneType)
  type: PhoneType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;
}

export class PersonalDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  @MaxLength(50)
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  issuingCountry?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

export class EmergencyContactDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(100)
  relationship: string;

  @ValidateNested()
  @Type(() => PhoneNumberDto)
  phone: PhoneNumberDto;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;
}

export class WorkAddressDto {
  @IsString()
  @MaxLength(200)
  company: string;

  @IsString()
  @MaxLength(200)
  street: string;

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
  @MaxLength(20)
  phone?: string;
}

export class PreferencesDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  promotionalEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  twoFactorAuth?: boolean;
}

export class DrEnvioProfileDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  preferredDeliveryTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialInstructions?: string;

  @IsOptional()
  deliveryPreferences?: {
    allowWeekendDelivery?: boolean;
    allowEveningDelivery?: boolean;
    requireSignature?: boolean;
    allowNeighborDelivery?: boolean;
  };
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationality?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalDocumentDto)
  documents?: PersonalDocumentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDto)
  phoneNumbers?: PhoneNumberDto[];

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  alternativeEmail?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkAddressDto)
  workAddress?: WorkAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DrEnvioProfileDto)
  drEnvioProfile?: DrEnvioProfileDto;
}