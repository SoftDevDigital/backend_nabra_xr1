import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationDocument, NotificationType, NotificationChannel, NotificationStatus, NotificationPriority } from '../schemas/notification.schema';
import { NotificationTemplate, NotificationTemplateDocument } from '../schemas/notification-template.schema';
import { NotificationPreference, NotificationPreferenceDocument } from '../schemas/notification-preference.schema';
import { CreateNotificationDto, SendBulkNotificationDto, SendNotificationBySegmentDto } from '../dtos/create-notification.dto';
import { NotificationResponseDto, NotificationStatsDto, NotificationSummaryDto, NotificationListResponseDto } from '../dtos/notification-response.dto';
import { UpdateNotificationPreferenceDto, NotificationPreferenceResponseDto } from '../dtos/notification-preference.dto';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationTemplate.name) private templateModel: Model<NotificationTemplateDocument>,
    @InjectModel(NotificationPreference.name) private preferenceModel: Model<NotificationPreferenceDocument>,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushService,
  ) {}

  // ===== CREAR NOTIFICACIONES =====

  async createNotification(createDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    try {
      // Validar preferencias del usuario
      const userPreferences = await this.getUserPreferences(createDto.userId);
      if (!this.isNotificationAllowed(createDto.type, createDto.channel, userPreferences)) {
        throw new BadRequestException('Notification not allowed by user preferences');
      }

      // Aplicar template si se especifica
      let finalContent = createDto.content;
      let finalTitle = createDto.title;
      
      if (createDto.templateId) {
        const template = await this.getTemplate(createDto.templateId);
        finalContent = this.processTemplate(template.content, createDto.templateData || {});
        finalTitle = this.processTemplate(template.subject, createDto.templateData || {});
      }

      // Crear notificación
      const notification = new this.notificationModel({
        ...createDto,
        content: finalContent,
        title: finalTitle,
        userId: new Types.ObjectId(createDto.userId),
        status: createDto.scheduledFor ? NotificationStatus.PENDING : NotificationStatus.PENDING,
      });

      const savedNotification = await notification.save();
      
      // Enviar inmediatamente si no está programada
      if (!createDto.scheduledFor) {
        await this.sendNotification((savedNotification as any)._id.toString());
      }

      return this.mapToResponseDto(savedNotification);
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async sendBulkNotification(createDto: SendBulkNotificationDto): Promise<string[]> {
    const notificationIds: string[] = [];
    
    for (const userId of createDto.userIds) {
      try {
        const notification = await this.createNotification({
          ...createDto,
          userId,
        });
        notificationIds.push(notification._id);
      } catch (error) {
        this.logger.error(`Error creating notification for user ${userId}:`, error);
      }
    }

    return notificationIds;
  }

  async sendNotificationBySegment(createDto: SendNotificationBySegmentDto): Promise<string[]> {
    // Obtener usuarios del segmento
    const userIds = await this.getUsersBySegment(createDto.segment);
    
    return this.sendBulkNotification({
      ...createDto,
      userIds,
    });
  }

  // ===== ENVÍO DE NOTIFICACIONES =====

  async sendNotification(notificationId: string): Promise<boolean> {
    try {
      const notification = await this.notificationModel.findById(notificationId);
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.status !== NotificationStatus.PENDING) {
        this.logger.warn(`Notification ${notificationId} is not pending`);
        return false;
      }

      // Verificar si está en horas silenciosas
      const userPreferences = await this.getUserPreferences(notification.userId.toString());
      if (this.isInQuietHours(notification.channel, userPreferences)) {
        // Reprogramar para después de las horas silenciosas
        await this.scheduleAfterQuietHours(notification);
        return false;
      }

      let success = false;
      let externalId: string | undefined;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          const emailResult = await this.emailService.sendEmail({
            to: notification.userId.toString(), // En la implementación real, obtener email del usuario
            subject: notification.title,
            content: notification.content,
            templateData: notification.templateData,
          });
          success = emailResult.success;
          externalId = emailResult.messageId;
          break;

        case NotificationChannel.SMS:
          const smsResult = await this.smsService.sendSms({
            to: notification.userId.toString(), // En la implementación real, obtener teléfono del usuario
            message: notification.content,
          });
          success = smsResult.success;
          externalId = smsResult.messageId;
          break;

        case NotificationChannel.PUSH:
          const pushResult = await this.pushService.sendPush({
            userId: notification.userId.toString(),
            title: notification.title,
            content: notification.content,
            data: notification.data,
          });
          success = pushResult.success;
          externalId = pushResult.messageId;
          break;

        default:
          throw new BadRequestException(`Unsupported channel: ${notification.channel}`);
      }

      // Actualizar estado de la notificación
      const updateData: any = {
        status: success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: new Date(),
        retryCount: (notification as any).retryCount + 1,
      };

      if (success) {
        updateData.externalId = externalId;
      } else {
        updateData.errorMessage = 'Failed to send notification';
      }

      await this.notificationModel.findByIdAndUpdate(notificationId, updateData);

      if (success) {
        this.logger.log(`Notification ${notificationId} sent successfully via ${notification.channel}`);
      } else {
        this.logger.error(`Failed to send notification ${notificationId} via ${notification.channel}`);
        
        // Reintentar si no se ha alcanzado el máximo
        if ((notification as any).retryCount < (notification as any).maxRetries) {
          await this.scheduleRetry(notification);
        }
      }

      return success;
    } catch (error) {
      this.logger.error(`Error sending notification ${notificationId}:`, error);
      
      // Marcar como fallida
      const failedNotification = await this.notificationModel.findById(notificationId);
      await this.notificationModel.findByIdAndUpdate(notificationId, {
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
        retryCount: ((failedNotification as any)?.retryCount || 0) + 1,
      });

      return false;
    }
  }

  // ===== CONSULTAS =====

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      type?: NotificationType;
      channel?: NotificationChannel;
      status?: NotificationStatus;
      unreadOnly?: boolean;
    }
  ): Promise<NotificationListResponseDto> {
    const skip = (page - 1) * limit;
    const filter: any = { userId: new Types.ObjectId(userId) };

    if (filters?.type) filter.type = filters.type;
    if (filters?.channel) filter.channel = filters.channel;
    if (filters?.status) filter.status = filters.status;
    if (filters?.unreadOnly) filter.readAt = { $exists: false };

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    const stats = await this.getUserNotificationStats(userId);

    return {
      notifications: notifications.map(n => this.mapToSummaryDto(n)),
      total,
      page,
      limit,
      hasMore: skip + notifications.length < total,
      stats,
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId: new Types.ObjectId(userId) },
      { 
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
      { new: true }
    );

    return !!notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { 
        userId: new Types.ObjectId(userId),
        readAt: { $exists: false },
      },
      { 
        status: NotificationStatus.READ,
        readAt: new Date(),
      }
    );

    return result.modifiedCount;
  }

  // ===== PREFERENCIAS =====

  async getUserPreferences(userId: string): Promise<NotificationPreferenceResponseDto> {
    let preferences: any = await this.preferenceModel.findOne({ userId: new Types.ObjectId(userId) });
    
    if (!preferences) {
      // Crear preferencias por defecto
      preferences = await this.createDefaultPreferences(userId);
    }

    return this.mapPreferenceToResponseDto(preferences);
  }

  async updateUserPreferences(
    userId: string, 
    updateDto: UpdateNotificationPreferenceDto
  ): Promise<NotificationPreferenceResponseDto> {
    const preferences = await this.preferenceModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { 
        ...updateDto,
        lastUpdatedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    return this.mapPreferenceToResponseDto(preferences);
  }

  // ===== ESTADÍSTICAS =====

  async getNotificationStats(filters?: {
    type?: NotificationType;
    channel?: NotificationChannel;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<NotificationStatsDto> {
    const filter: any = {};
    
    if (filters?.type) filter.type = filters.type;
    if (filters?.channel) filter.channel = filters.channel;
    if (filters?.dateFrom || filters?.dateTo) {
      filter.createdAt = {};
      if (filters.dateFrom) filter.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) filter.createdAt.$lte = filters.dateTo;
    }

    const [total, sent, delivered, failed, pending, read] = await Promise.all([
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({ ...filter, status: NotificationStatus.SENT }),
      this.notificationModel.countDocuments({ ...filter, status: NotificationStatus.DELIVERED }),
      this.notificationModel.countDocuments({ ...filter, status: NotificationStatus.FAILED }),
      this.notificationModel.countDocuments({ ...filter, status: NotificationStatus.PENDING }),
      this.notificationModel.countDocuments({ ...filter, readAt: { $exists: true } }),
    ]);

    return {
      total,
      sent,
      delivered,
      failed,
      pending,
      read,
      unread: total - read,
    };
  }

  async getUserNotificationStats(userId: string): Promise<NotificationStatsDto> {
    return this.getNotificationStats({ userId: new Types.ObjectId(userId) } as any);
  }

  // ===== CRON JOBS =====

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await this.notificationModel.find({
        status: NotificationStatus.PENDING,
        scheduledFor: { $lte: new Date() },
      }).limit(100);

      for (const notification of scheduledNotifications) {
        await this.sendNotification((notification as any)._id.toString());
      }
    } catch (error) {
      this.logger.error('Error processing scheduled notifications:', error);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryFailedNotifications(): Promise<void> {
    try {
      const failedNotifications = await this.notificationModel.find({
        status: NotificationStatus.FAILED,
        retryCount: { $lt: 3 }, // maxRetries
        $or: [
          { scheduledFor: { $exists: false } },
          { scheduledFor: { $lte: new Date() } },
        ],
      }).limit(50);

      for (const notification of failedNotifications) {
        await this.sendNotification((notification as any)._id.toString());
      }
    } catch (error) {
      this.logger.error('Error retrying failed notifications:', error);
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  private async getTemplate(templateId: string): Promise<NotificationTemplate> {
    const template = await this.templateModel.findById(templateId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  private processTemplate(content: string, data: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private async getUsersBySegment(segment: string): Promise<string[]> {
    // Implementar lógica para obtener usuarios por segmento
    // Por ahora, retornar usuarios activos
    try {
      // Simular obtención de usuarios por segmento
      // En producción, implementar lógica real de segmentación
      const segments: Record<string, string[]> = {
        'all_users': [],
        'active_users': [],
        'premium_users': [],
        'cart_abandoners': [],
        'new_users': [],
      };

      return segments[segment] || [];
    } catch (error) {
      this.logger.error('Error getting users by segment:', error);
      return [];
    }
  }

  private isNotificationAllowed(
    type: NotificationType,
    channel: NotificationChannel,
    preferences: NotificationPreferenceResponseDto
  ): boolean {
    const typePreference = preferences.preferences[type];
    if (!typePreference) return false;

    switch (channel) {
      case NotificationChannel.EMAIL:
        return ['email_only', 'email_and_sms', 'email_and_push', 'all_channels'].includes(typePreference);
      case NotificationChannel.SMS:
        return ['sms_only', 'email_and_sms', 'sms_and_push', 'all_channels'].includes(typePreference);
      case NotificationChannel.PUSH:
        return ['push_only', 'email_and_push', 'sms_and_push', 'all_channels'].includes(typePreference);
      default:
        return false;
    }
  }

  private isInQuietHours(channel: NotificationChannel, preferences: NotificationPreferenceResponseDto): boolean {
    const channelSettings = preferences.channelSettings[channel];
    if (!channelSettings?.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: preferences.timezone 
    });

    const { start, end } = channelSettings.quietHours;
    return currentTime >= start && currentTime <= end;
  }

  private async scheduleAfterQuietHours(notification: Notification): Promise<void> {
    const userPreferences = await this.getUserPreferences(notification.userId.toString());
    const channelSettings = userPreferences.channelSettings[notification.channel];
    
    if (!channelSettings?.quietHours) return;

    const { end } = channelSettings.quietHours;
    const [hours, minutes] = end.split(':');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    await this.notificationModel.findByIdAndUpdate((notification as any)._id, {
      scheduledFor: tomorrow,
    });
  }

  private async scheduleRetry(notification: Notification): Promise<void> {
    const retryDelay = Math.pow(2, (notification as any).retryCount) * 60000; // Exponential backoff
    const scheduledFor = new Date(Date.now() + retryDelay);

    await this.notificationModel.findByIdAndUpdate((notification as any)._id, {
      status: NotificationStatus.PENDING,
      scheduledFor,
    });
  }

  private async createDefaultPreferences(userId: string): Promise<any> {
    const defaultPreferences = new this.preferenceModel({
      userId: new Types.ObjectId(userId),
      preferences: {
        order_confirmed: 'all_channels',
        order_shipped: 'all_channels',
        order_delivered: 'all_channels',
        payment_success: 'all_channels',
        payment_failed: 'all_channels',
        welcome: 'email_and_push',
        product_recommendation: 'email_only',
        price_drop: 'email_and_push',
        back_in_stock: 'email_and_push',
        cart_abandonment: 'email_only',
        promotion: 'email_only',
        security_alert: 'all_channels',
        account_update: 'email_only',
        review_reminder: 'email_only',
      },
      channelSettings: {
        email: { enabled: true, frequency: 'immediate' },
        sms: { enabled: true, frequency: 'immediate' },
        push: { enabled: true, frequency: 'immediate' },
      },
      allowMarketing: true,
      allowTransactional: true,
      allowSystem: true,
      language: 'es',
      timezone: 'America/Mexico_City',
    });

    return defaultPreferences.save();
  }

  private mapToResponseDto(notification: Notification): NotificationResponseDto {
    return {
      _id: (notification as any)._id.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      channel: notification.channel,
      title: notification.title,
      content: notification.content,
      data: notification.data,
      status: notification.status,
      priority: notification.priority,
      scheduledFor: notification.scheduledFor,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      errorMessage: notification.errorMessage,
      metadata: notification.metadata,
      retryCount: notification.retryCount,
      maxRetries: notification.maxRetries,
      templateId: notification.templateId,
      templateData: notification.templateData,
      externalId: notification.externalId,
      isActive: notification.isActive,
      expiresAt: notification.expiresAt,
      createdAt: (notification as any).createdAt,
      updatedAt: (notification as any).updatedAt,
    };
  }

  private mapToSummaryDto(notification: Notification): NotificationSummaryDto {
    return {
      _id: (notification as any)._id.toString(),
      type: notification.type,
      channel: notification.channel,
      title: notification.title,
      status: notification.status,
      priority: notification.priority,
      createdAt: (notification as any).createdAt,
      readAt: notification.readAt,
      isRead: !!notification.readAt,
    };
  }

  private mapPreferenceToResponseDto(preference: NotificationPreference): NotificationPreferenceResponseDto {
    return {
      userId: preference.userId.toString(),
      preferences: preference.preferences,
      channelSettings: preference.channelSettings,
      blockedTypes: preference.blockedTypes,
      blockedCategories: preference.blockedCategories,
      allowMarketing: preference.allowMarketing,
      allowTransactional: preference.allowTransactional,
      allowSystem: preference.allowSystem,
      language: preference.language,
      timezone: preference.timezone,
      isActive: preference.isActive,
      lastUpdatedAt: preference.lastUpdatedAt,
      createdAt: (preference as any).createdAt,
      updatedAt: (preference as any).updatedAt,
    };
  }
}
