import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsEnum,
  IsDateString,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GoogleProfileDto {
  @IsString()
  id: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsBoolean()
  verified_email?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  given_name?: string;

  @IsOptional()
  @IsString()
  family_name?: string;

  @IsOptional()
  @IsString()
  picture?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class GoogleTokensDto {
  @IsOptional()
  @IsString()
  access_token?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;

  @IsOptional()
  @IsNumber()
  expires_in?: number;

  @IsOptional()
  @IsString()
  token_type?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  id_token?: string;
}

export class CreateGoogleUserDto {
  @IsString()
  googleId: string;

  @IsEmail()
  email: string;

  @IsObject()
  @ValidateNested()
  @Type(() => GoogleProfileDto)
  googleProfile: GoogleProfileDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GoogleTokensDto)
  tokens?: GoogleTokensDto;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  linkedUserId?: string;
}
