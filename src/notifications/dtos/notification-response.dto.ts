import { NotificationType, NotificationChannel, NotificationStatus, NotificationPriority } from '../schemas/notification.schema';

export class NotificationResponseDto {
  _id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  content: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  priority: NotificationPriority;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  templateId?: string;
  templateData?: Record<string, any>;
  externalId?: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationStatsDto {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  read: number;
  unread: number;
}

export class NotificationSummaryDto {
  _id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  createdAt: Date;
  readAt?: Date;
  isRead: boolean;
}

export class NotificationListResponseDto {
  notifications: NotificationSummaryDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  stats: NotificationStatsDto;
}
