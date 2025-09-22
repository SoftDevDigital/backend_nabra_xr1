import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

// Importar servicios y controladores
import { GoogleAuthController } from './controllers/google-auth.controller';
import { GoogleUserService } from './services/google-user.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';

// Importar esquemas
import { GoogleUser, GoogleUserSchema } from './schemas/google-user.schema';

// Importar configuración
import { googleAuthConfig } from './google-auth.config';

@Module({
  imports: [
    // Configuración
    ConfigModule,
    
    // Passport para autenticación
    PassportModule.register({ 
      defaultStrategy: 'google',
      session: false, // No usamos sesiones, solo JWT
    }),
    
    // JWT para tokens
    JwtModule.register({
      secret: googleAuthConfig.jwtSecret,
      signOptions: { 
        expiresIn: googleAuthConfig.jwtExpiresIn,
        issuer: 'nabra-xr1-backend',
        audience: 'nabra-xr1-frontend',
      },
    }),
    
    // MongoDB para Google Users
    MongooseModule.forFeature([
      { name: GoogleUser.name, schema: GoogleUserSchema },
    ]),
  ],
  controllers: [GoogleAuthController],
  providers: [
    GoogleUserService,
    GoogleStrategy,
    GoogleAuthGuard,
  ],
  exports: [
    GoogleUserService,
    GoogleStrategy,
    GoogleAuthGuard,
    PassportModule,
    JwtModule,
  ],
})
export class GoogleAuthModule {}
