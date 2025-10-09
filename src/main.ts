import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Cargar variables de entorno antes de iniciar la aplicación
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Configuración global de validación
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Configuración de CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN')?.split(',') || ['http://localhost:3000', 'https://nabra.mx', 'http://nabra.mx'],
    credentials: configService.get('CORS_CREDENTIALS') === 'true',
    methods: configService.get('CORS_METHODS')?.split(',') || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: configService.get('CORS_ALLOWED_HEADERS')?.split(',') || ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Puerto desde variables de entorno
  const port = configService.get('PORT') || 3001;
  await app.listen(port);
}
bootstrap();
