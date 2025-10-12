import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Extractor personalizado: Primero intenta desde cookies, luego desde header Authorization
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Intentar desde cookie HTTP-only (método seguro)
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['access_token'];
          }
          return token;
        },
        // 2. Fallback al header Authorization tradicional (compatibilidad)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Soporte para usuarios tradicionales y de Google
    return { 
      userId: payload.sub, 
      email: payload.email, 
      role: payload.role,
      isGoogleUser: payload.isGoogleUser || false,
      googleId: payload.googleId,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
  }
}
