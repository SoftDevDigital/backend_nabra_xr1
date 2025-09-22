import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { CreateNotificationDto, SendBulkNotificationDto, SendNotificationBySegmentDto } from '../dtos/create-notification.dto';
import { UpdateNotificationPreferenceDto } from '../dtos/notification-preference.dto';
import { NotificationType, NotificationChannel, NotificationStatus } from '../schemas/notification.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ===== CREAR NOTIFICACIONES (ADMIN) =====

  @Post()
  @Roles('admin')
  async createNotification(@Body() createDto: CreateNotificationDto) {
    return this.notificationsService.createNotification(createDto);
  }

  @Post('bulk')
  @Roles('admin')
  async sendBulkNotification(@Body() createDto: SendBulkNotificationDto) {
    const notificationIds = await this.notificationsService.sendBulkNotification(createDto);
    return {
      success: true,
      notificationIds,
      count: notificationIds.length,
    };
  }

  @Post('segment')
  @Roles('admin')
  async sendNotificationBySegment(@Body() createDto: SendNotificationBySegmentDto) {
    const notificationIds = await this.notificationsService.sendNotificationBySegment(createDto);
    return {
      success: true,
      notificationIds,
      count: notificationIds.length,
    };
  }

  // ===== NOTIFICACIONES DEL USUARIO =====

  @Get()
  async getUserNotifications(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user.userId;
    const filters = {
      type,
      channel,
      status,
      unreadOnly: unreadOnly === 'true',
    };

    return this.notificationsService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit),
      filters,
    );
  }

  @Get('stats')
  async getUserNotificationStats(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUserNotificationStats(userId);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    const success = await this.notificationsService.markAsRead(id, userId);
    
    if (!success) {
      throw new Error('Notification not found or already read');
    }
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationsService.markAllAsRead(userId);
    return {
      success: true,
      markedCount: count,
    };
  }

  // ===== PREFERENCIAS DEL USUARIO =====

  @Get('preferences')
  async getUserPreferences(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUserPreferences(userId);
  }

  @Put('preferences')
  async updateUserPreferences(
    @Request() req,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.updateUserPreferences(userId, updateDto);
  }

  // ===== ESTADÍSTICAS GENERALES (ADMIN) =====

  @Get('admin/stats')
  @Roles('admin')
  async getNotificationStats(
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const filters: any = {};
    
    if (type) filters.type = type;
    if (channel) filters.channel = channel;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    return this.notificationsService.getNotificationStats(filters);
  }

  @Get('admin/users/:userId/notifications')
  @Roles('admin')
  async getAdminUserNotifications(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
  ) {
    const filters = { type, channel, status };

    return this.notificationsService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit),
      filters,
    );
  }

  @Get('admin/users/:userId/preferences')
  @Roles('admin')
  async getAdminUserPreferences(@Param('userId') userId: string) {
    return this.notificationsService.getUserPreferences(userId);
  }

  @Put('admin/users/:userId/preferences')
  @Roles('admin')
  async updateAdminUserPreferences(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updateUserPreferences(userId, updateDto);
  }

  // ===== ENDPOINTS PÚBLICOS =====

  @Post('webhook/delivery')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleDeliveryWebhook(@Body() webhookData: any) {
    // En producción, implementar webhooks de proveedores
    this.notificationsService['logger'].log('Delivery webhook received:', webhookData);
    return { success: true };
  }

  @Post('webhook/opened')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleOpenedWebhook(@Body() webhookData: any) {
    // En producción, implementar webhooks de proveedores
    this.notificationsService['logger'].log('Opened webhook received:', webhookData);
    return { success: true };
  }

  @Post('webhook/clicked')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleClickedWebhook(@Body() webhookData: any) {
    // En producción, implementar webhooks de proveedores
    this.notificationsService['logger'].log('Clicked webhook received:', webhookData);
    return { success: true };
  }

  @Post('unsubscribe/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Param('token') token: string) {
    // En producción, implementar lógica de unsubscribe
    this.notificationsService['logger'].log('Unsubscribe request for token:', token);
    return { success: true, message: 'Successfully unsubscribed' };
  }

  // ===== ENDPOINTS DE DESARROLLO/TESTING =====

  @Post('test/send')
  @Roles('admin')
  async testSendNotification(
    @Body() body: {
      userId: string;
      type: NotificationType;
      channel: NotificationChannel;
      title: string;
      content: string;
    },
  ) {
    const notification = await this.notificationsService.createNotification(body);
    return {
      success: true,
      notification,
    };
  }

  @Post('test/template')
  @Roles('admin')
  async testTemplateNotification(
    @Body() body: {
      userId: string;
      templateId: string;
      channel: NotificationChannel;
      templateData: Record<string, any>;
    },
  ) {
    const notification = await this.notificationsService.createNotification({
      userId: body.userId,
      type: NotificationType.WELCOME, // Default type for testing
      channel: body.channel,
      title: 'Test Notification',
      content: 'This is a test notification',
      templateId: body.templateId,
      templateData: body.templateData,
    });

    return {
      success: true,
      notification,
    };
  }
}
