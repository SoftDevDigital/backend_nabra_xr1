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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ===== CREAR NOTIFICACIONES (ADMIN) =====

  @ApiOperation({ summary: 'Crear notificación (admin)', description: 'Crea una notificación dirigida a uno o varios usuarios.' })
  @Post()
  @Roles('admin')
  async createNotification(@Body() createDto: CreateNotificationDto) {
    return this.notificationsService.createNotification(createDto);
  }

  @ApiOperation({ summary: 'Enviar notificaciones masivas (admin)', description: 'Envía notificaciones en lote a múltiples usuarios.' })
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

  @ApiOperation({ summary: 'Enviar por segmento (admin)', description: 'Envía notificaciones filtrando por segmento (tipo/canal).' })
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

  @ApiOperation({ summary: 'Mis notificaciones', description: 'Listado de notificaciones del usuario autenticado con filtros y paginación.' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
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

  @ApiOperation({ summary: 'Mis estadísticas', description: 'Estadísticas básicas de notificaciones del usuario.' })
  @Get('stats')
  async getUserNotificationStats(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUserNotificationStats(userId);
  }

  @ApiOperation({ summary: 'Marcar como leída', description: 'Marca una notificación como leída.' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    const success = await this.notificationsService.markAsRead(id, userId);
    
    if (!success) {
      throw new Error('Notification not found or already read');
    }
  }

  @ApiOperation({ summary: 'Marcar todas como leídas', description: 'Marca todas las notificaciones del usuario como leídas.' })
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

  @ApiOperation({ summary: 'Mis preferencias', description: 'Obtiene preferencias de notificación del usuario.' })
  @Get('preferences')
  async getUserPreferences(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUserPreferences(userId);
  }

  @ApiOperation({ summary: 'Actualizar preferencias', description: 'Actualiza preferencias de notificación del usuario.' })
  @Put('preferences')
  async updateUserPreferences(
    @Request() req,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.updateUserPreferences(userId, updateDto);
  }

  // ===== ESTADÍSTICAS GENERALES (ADMIN) =====

  @ApiOperation({ summary: 'Estadísticas generales (admin)', description: 'Estadísticas de notificaciones a nivel sistema.' })
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

  @ApiOperation({ summary: 'Notificaciones de usuario (admin)', description: 'Listado de notificaciones de un usuario específico.' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
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

  @ApiOperation({ summary: 'Preferencias de usuario (admin)', description: 'Obtiene preferencias de un usuario específico.' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @Get('admin/users/:userId/preferences')
  @Roles('admin')
  async getAdminUserPreferences(@Param('userId') userId: string) {
    return this.notificationsService.getUserPreferences(userId);
  }

  @ApiOperation({ summary: 'Actualizar preferencias (admin)', description: 'Actualiza preferencias de un usuario específico.' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @Put('admin/users/:userId/preferences')
  @Roles('admin')
  async updateAdminUserPreferences(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updateUserPreferences(userId, updateDto);
  }

  // ===== ENDPOINTS PÚBLICOS =====

  @ApiOperation({ summary: 'Webhook de delivery', description: 'Webhook de proveedor para eventos de entrega (frontend no lo usa).' })
  @Post('webhook/delivery')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleDeliveryWebhook(@Body() webhookData: any) {
    // En producción, implementar webhooks de proveedores
    this.notificationsService['logger'].log('Delivery webhook received:', webhookData);
    return { success: true };
  }

  @ApiOperation({ summary: 'Webhook de apertura', description: 'Webhook de proveedor para eventos de apertura (frontend no lo usa).' })
  @Post('webhook/opened')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleOpenedWebhook(@Body() webhookData: any) {
    // En producción, implementar webhooks de proveedores
    this.notificationsService['logger'].log('Opened webhook received:', webhookData);
    return { success: true };
  }

  @ApiOperation({ summary: 'Webhook de clic', description: 'Webhook de proveedor para eventos de clic (frontend no lo usa).' })
  @Post('webhook/clicked')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleClickedWebhook(@Body() webhookData: any) {
    // En producción, implementar webhooks de proveedores
    this.notificationsService['logger'].log('Clicked webhook received:', webhookData);
    return { success: true };
  }

  @ApiOperation({ summary: 'Darse de baja', description: 'Endpoint público para desuscripción con token.' })
  @ApiParam({ name: 'token', description: 'Token de desuscripción' })
  @Post('unsubscribe/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Param('token') token: string) {
    // En producción, implementar lógica de unsubscribe
    this.notificationsService['logger'].log('Unsubscribe request for token:', token);
    return { success: true, message: 'Successfully unsubscribed' };
  }

  // ===== ENDPOINTS DE DESARROLLO/TESTING ===== (eliminados)
}
