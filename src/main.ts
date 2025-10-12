import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  
  // Middleware para parsear cookies (necesario para autenticación con cookies seguras)
  app.use(cookieParser());
  
  // Configuración global de validación
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Servir archivos estáticos (imágenes)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Configuración de CORS simplificada
  app.enableCors({
    origin: ['http://localhost:3000', 'https://nabra.mx'],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nabra API')
    .setDescription('Documentación detallada de la API de Nabra: endpoints, parámetros, respuestas y ejemplos para frontend')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        description: 'Introduce el token JWT con el prefijo Bearer',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Nabra API Docs',
  });

  // Puerto desde variables de entorno
  const port = configService.get('PORT') || 3001;
  await app.listen(port);
}
bootstrap();
