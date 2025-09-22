import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { GoogleUserService } from '../services/google-user.service';
import { googleAuthConfig } from '../google-auth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private configService: ConfigService,
    private googleUserService: GoogleUserService,
  ) {
    super({
      clientID: googleAuthConfig.clientId,
      clientSecret: googleAuthConfig.clientSecret,
      callbackURL: googleAuthConfig.callbackUrl,
      scope: googleAuthConfig.scope,
      // Configuración adicional de seguridad
      passReqToCallback: false,
      // Configuración de proxy (si es necesario)
      proxy: process.env.NODE_ENV === 'production',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      this.logger.log(`Google OAuth validation for user: ${profile.id}`);

      // Validar que el email esté verificado por Google
      if (googleAuthConfig.validation.requireVerifiedEmail && !profile.emails?.[0]?.verified) {
        this.logger.warn(`Unverified email for Google user: ${profile.id}`);
        throw new UnauthorizedException('Email address must be verified by Google');
      }

      // Validar dominios de email permitidos (si está configurado)
      const email = profile.emails?.[0]?.value;
      if (googleAuthConfig.validation.allowedEmailDomains.length > 0 && email) {
        const emailDomain = email.split('@')[1];
        if (!googleAuthConfig.validation.allowedEmailDomains.includes(emailDomain)) {
          this.logger.warn(`Email domain not allowed: ${emailDomain} for user: ${profile.id}`);
          throw new UnauthorizedException('Email domain not allowed');
        }
      }

      // Preparar datos del perfil de Google
      const googleProfileData = {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        verified_email: profile.emails?.[0]?.verified,
        name: profile.displayName,
        given_name: profile.name?.givenName,
        family_name: profile.name?.familyName,
        picture: profile.photos?.[0]?.value,
        locale: profile.locale,
      };

      // Preparar tokens
      const tokensData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: profile._json?.expires_in,
        token_type: profile._json?.token_type,
        scope: profile._json?.scope,
        id_token: profile._json?.id_token,
      };

      // Buscar o crear usuario de Google
      let googleUser = await this.googleUserService.findByGoogleId(profile.id);

      if (!googleUser) {
        // Crear nuevo usuario de Google
        this.logger.log(`Creating new Google user: ${profile.id}`);
        
        googleUser = await this.googleUserService.createGoogleUser({
          googleId: profile.id,
          email: googleProfileData.email,
          googleProfile: googleProfileData,
          tokens: tokensData,
          firstName: googleProfileData.given_name,
          lastName: googleProfileData.family_name,
          displayName: googleProfileData.name,
          avatarUrl: googleProfileData.picture,
          locale: googleProfileData.locale,
        });

        this.logger.log(`Google user created successfully: ${googleUser._id}`);
      } else {
        // Actualizar usuario existente
        this.logger.log(`Updating existing Google user: ${googleUser._id}`);
        
        googleUser = await this.googleUserService.updateGoogleUser((googleUser._id as any).toString(), {
          googleProfile: googleProfileData,
          tokens: tokensData,
          firstName: googleProfileData.given_name,
          lastName: googleProfileData.family_name,
          displayName: googleProfileData.name,
          avatarUrl: googleProfileData.picture,
          locale: googleProfileData.locale,
          lastTokenRefresh: new Date(),
        });

        this.logger.log(`Google user updated successfully: ${googleUser._id}`);
      }

      // Incrementar contador de logins
      await this.googleUserService.incrementLoginCount((googleUser._id as any).toString());

      // Log de éxito
      if (googleAuthConfig.logging.logAuthSuccesses) {
        this.logger.log(`Google OAuth successful for user: ${googleUser.email}`);
      }

      // Retornar datos del usuario para JWT
      const userPayload = {
        _id: googleUser._id,
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.displayName || googleUser.firstName,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        avatarUrl: googleUser.avatarUrl,
        isGoogleUser: true,
        linkedUserId: googleUser.linkedUserId,
      };

      return done(null, userPayload);

    } catch (error) {
      this.logger.error(`Google OAuth validation error: ${error.message}`, error.stack);
      
      if (googleAuthConfig.logging.logAuthFailures) {
        this.logger.error(`Google OAuth failed for profile: ${profile.id}`);
      }

      // Incrementar contador de intentos fallidos si el usuario existe
      try {
        const existingUser = await this.googleUserService.findByGoogleId(profile.id);
        if (existingUser) {
          await this.googleUserService.incrementFailedLoginAttempts((existingUser._id as any).toString());
        }
      } catch (incrementError) {
        this.logger.error(`Error incrementing failed login attempts: ${incrementError.message}`);
      }

      return done(error, false);
    }
  }
}
