import { IsEnum, IsObject, IsOptional, IsBoolean, IsString, IsArray } from 'class-validator';
import { PreferenceLevel } from '../schemas/notification-preference.schema';

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsObject()
  preferences?: {
    order_confirmed?: PreferenceLevel;
    order_shipped?: PreferenceLevel;
    order_delivered?: PreferenceLevel;
    payment_success?: PreferenceLevel;
    payment_failed?: PreferenceLevel;
    welcome?: PreferenceLevel;
    product_recommendation?: PreferenceLevel;
    price_drop?: PreferenceLevel;
    back_in_stock?: PreferenceLevel;
    cart_abandonment?: PreferenceLevel;
    promotion?: PreferenceLevel;
    security_alert?: PreferenceLevel;
    account_update?: PreferenceLevel;
    review_reminder?: PreferenceLevel;
  };

  @IsOptional()
  @IsObject()
  channelSettings?: {
    email?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly' | 'never';
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
    sms?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly' | 'never';
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
    push?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly' | 'never';
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedCategories?: string[];

  @IsOptional()
  @IsBoolean()
  allowMarketing?: boolean;

  @IsOptional()
  @IsBoolean()
  allowTransactional?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSystem?: boolean;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class NotificationPreferenceResponseDto {
  userId: string;
  preferences: Record<string, PreferenceLevel>;
  channelSettings: {
    email?: {
      enabled: boolean;
      frequency: string;
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
    sms?: {
      enabled: boolean;
      frequency: string;
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
    push?: {
      enabled: boolean;
      frequency: string;
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
  };
  blockedTypes: string[];
  blockedCategories: string[];
  allowMarketing: boolean;
  allowTransactional: boolean;
  allowSystem: boolean;
  language: string;
  timezone: string;
  isActive: boolean;
  lastUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
