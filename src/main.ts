import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
    origin: configService.get('CORS_ORIGIN')?.split(',') || ['http://localhost:3000'],
    credentials: configService.get('CORS_CREDENTIALS') === 'true',
    methods: configService.get('CORS_METHODS')?.split(',') || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: configService.get('CORS_ALLOWED_HEADERS')?.split(',') || ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Puerto desde variables de entorno
  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
  console.log(`📖 Documentación API: http://localhost:${port}/api`);
}
bootstrap();
