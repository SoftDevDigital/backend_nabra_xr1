import { IsString, IsOptional, IsBoolean, IsObject, IsNumber } from 'class-validator';

export class GoogleUserResponseDto {
  @IsString()
  _id: string;

  @IsString()
  googleId: string;

  @IsString()
  email: string;

  @IsString()
  name: string;

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

  @IsBoolean()
  isGoogleUser: boolean;

  @IsOptional()
  @IsString()
  linkedUserId?: string;

  @IsString()
  access_token: string;

  @IsString()
  token_type: string;

  @IsNumber()
  expires_in: number;
}

export class GoogleAuthUrlResponseDto {
  @IsString()
  authUrl: string;

  @IsString()
  state: string;
}

export class GoogleLinkResponseDto {
  @IsString()
  message: string;

  @IsBoolean()
  linked: boolean;

  @IsOptional()
  @IsObject()
  user?: GoogleUserResponseDto;
}

export class GoogleUserProfileDto {
  @IsString()
  _id: string;

  @IsString()
  googleId: string;

  @IsString()
  email: string;

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

  @IsBoolean()
  emailNotifications: boolean;

  @IsBoolean()
  marketingEmails: boolean;

  @IsString()
  preferredLanguage: string;

  @IsNumber()
  loginCount: number;

  @IsString()
  createdAt: string;

  @IsOptional()
  @IsString()
  lastLoginAt?: string;
}
