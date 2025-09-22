import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Schemas
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationTemplate, NotificationTemplateSchema } from './schemas/notification-template.schema';
import { NotificationPreference, NotificationPreferenceSchema } from './schemas/notification-preference.schema';

// Services
import { NotificationsService } from './services/notifications.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    SmsService,
    PushService,
  ],
  exports: [
    NotificationsService,
    EmailService,
    SmsService,
    PushService,
  ],
})
export class NotificationsModule {}
