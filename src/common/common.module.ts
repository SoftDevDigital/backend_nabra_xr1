import { Module, forwardRef } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { ErrorHandlerInterceptor } from './interceptors/error-handler.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LocationService } from './services/location.service';
import { LocationController } from './controllers/location.controller';
import { TestOrderEmailController } from './controllers/test-order-email.controller';
import { ContactController } from './controllers/contact.controller';
import { ConfigModule } from '@nestjs/config';
import zohoConfig from '../config/zoho.config';
import { MailService } from './services/mail.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
	imports: [HttpModule, ConfigModule.forFeature(zohoConfig), forwardRef(() => OrdersModule)],
	controllers: [LocationController, TestOrderEmailController, ContactController],
	providers: [
		{
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ResponseInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ErrorHandlerInterceptor,
		},
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
		{
			provide: APP_GUARD,
			useClass: RolesGuard,
		},
		LocationService,
		MailService,
	],
	exports: [LocationService, MailService],
})
export class CommonModule {}
