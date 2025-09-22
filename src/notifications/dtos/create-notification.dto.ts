import { IsEnum, IsString, IsOptional, IsObject, IsDateString, IsNumber, IsBoolean } from 'class-validator';
import { NotificationType, NotificationChannel, NotificationPriority } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsDateString()
  scheduledFor?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class SendBulkNotificationDto {
  @IsString()
  userIds: string[]; // Array de IDs de usuarios

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsDateString()
  scheduledFor?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;
}

export class SendNotificationBySegmentDto {
  @IsString()
  segment: string; // 'all_users', 'active_users', 'premium_users', etc.

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsDateString()
  scheduledFor?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;
}
