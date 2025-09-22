import { PartialType } from '@nestjs/mapped-types';
import { CreateGoogleUserDto } from './create-google-user.dto';
import {
  IsString,
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

export class GoogleProfileUpdateDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  email?: string;

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

export class GoogleTokensUpdateDto {
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

export class UpdateGoogleUserDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GoogleProfileUpdateDto)
  googleProfile?: GoogleProfileUpdateDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GoogleTokensUpdateDto)
  tokens?: GoogleTokensUpdateDto;

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

  @IsOptional()
  @IsDateString()
  lastLoginAt?: Date;

  @IsOptional()
  @IsDateString()
  lastTokenRefresh?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAddresses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userAgents?: string[];
}
