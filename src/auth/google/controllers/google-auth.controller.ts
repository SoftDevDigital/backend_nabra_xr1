import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  Req,
  Res,
  Body,
  Query,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { GoogleUserService } from '../services/google-user.service';
import { JwtService } from '@nestjs/jwt';
import { googleAuthConfig } from '../google-auth.config';
import { GoogleAuthUrlResponseDto, GoogleUserResponseDto, GoogleLinkResponseDto } from '../dtos/google-auth-response.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth - Google')
@Controller('auth/google')
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private googleUserService: GoogleUserService,
    private jwtService: JwtService,
  ) {}

  // ===== INICIO DE SESIÓN CON GOOGLE =====

  @ApiOperation({ summary: 'Login con Google (redirect)', description: 'Redirige a Google OAuth para iniciar el flujo de autenticación.' })
  @Get()
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    // Este endpoint redirige a Google OAuth
    // La lógica se maneja en la estrategia de Google
  }

  @ApiOperation({ summary: 'Callback de Google', description: 'Procesa el callback de Google, genera JWT y redirige al frontend con token y datos.' })
  @Get('callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      // 🔍 LOG 1: Inicio del callback
      console.log('\n🎯 ========== GOOGLE OAUTH CALLBACK INICIADO ==========');
      console.log(`📍 Variables de entorno cargadas:`);
      console.log(`   GOOGLE_SUCCESS_REDIRECT: ${process.env.GOOGLE_SUCCESS_REDIRECT || '❌ NO DEFINIDA'}`);
      console.log(`   GOOGLE_FAILURE_REDIRECT: ${process.env.GOOGLE_FAILURE_REDIRECT || '❌ NO DEFINIDA'}`);
      console.log(`   GOOGLE_CALLBACK_URL: ${process.env.GOOGLE_CALLBACK_URL || '❌ NO DEFINIDA'}`);
      
      // 🔍 LOG 2: Valores del config
      console.log(`\n📍 Valores de googleAuthConfig:`);
      console.log(`   callbackUrl: ${googleAuthConfig.callbackUrl}`);
      console.log(`   successRedirect: ${googleAuthConfig.successRedirect}`);
      console.log(`   failureRedirect: ${googleAuthConfig.failureRedirect}`);

      const user = req.user as any;

      if (!user) {
        console.error('❌ No user data received from Google OAuth');
        const failUrl = `${googleAuthConfig.failureRedirect}?error=no_user_data`;
        console.error(`🔴 Redirigiendo a (FALLO): ${failUrl}`);
        return res.redirect(failUrl);
      }
      
      // 🔍 LOG 3: Usuario recibido
      console.log(`\n✅ Usuario recibido desde Strategy:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Google ID: ${user.googleId}`);

      // Generar JWT token
      // Validación de secreto JWT para evitar errores y bucles de redirección
      if (!googleAuthConfig.jwtSecret) {
        this.logger.error('JWT secret is missing. Set JWT_SECRET in environment variables.');
        return res.redirect(`${googleAuthConfig.failureRedirect}?error=missing_jwt_secret`);
      }

      // Emitir JWT unificado con identidad tradicional (sub => User._id)
      const payload = {
        sub: user._id,
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        isGoogleUser: true,
        linkedUserId: user.linkedUserId || user._id,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: googleAuthConfig.jwtSecret,
        expiresIn: googleAuthConfig.jwtExpiresIn,
      });

      // Actualizar actividad del usuario
      await this.googleUserService.updateUserActivity(
        user._id,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );

      this.logger.log(`Google OAuth successful for user: ${user.email}`);

      // Usar cookies HTTP-Only seguras para el token (mejor práctica de seguridad)
      // Esto evita que el token quede expuesto en URLs, logs, o historial del navegador
      res.cookie('access_token', accessToken, {
        httpOnly: true, // No accesible desde JavaScript (previene XSS)
        secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
        sameSite: 'lax', // Protección CSRF
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        path: '/',
      });

      // Datos básicos del usuario en cookie separada (pueden ser accesibles desde JS)
      const userData = {
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isGoogleUser: true,
      };

      res.cookie('user_data', JSON.stringify(userData), {
        httpOnly: false, // Accesible desde JS para mostrar info del usuario
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      // Redirigir al frontend con solo un indicador de éxito
      const redirectUrl = `${googleAuthConfig.successRedirect}?login=success`;

      // 🔍 LOG FINAL: URL de redirección
      console.log(`\n========== REDIRECCIÓN FINAL ==========`);
      console.log(`🎯 successRedirect desde config: ${googleAuthConfig.successRedirect}`);
      console.log(`🎯 URL completa de redirección: ${redirectUrl}`);
      console.log(`🚀 Ejecutando res.redirect() ahora...`);
      console.log('========== FIN GOOGLE OAUTH CALLBACK ==========\n');

      return res.redirect(redirectUrl);

    } catch (error) {
      console.error(`\n❌❌❌ Google OAuth callback error: ${error.message}`);
      console.error(error.stack);
      const errorUrl = `${googleAuthConfig.failureRedirect}?error=server_error`;
      console.error(`🔴 Redirigiendo a (ERROR): ${errorUrl}\n`);
      return res.redirect(errorUrl);
    }
  }

  // ===== OBTENER URL DE AUTENTICACIÓN =====

  @ApiOperation({ summary: 'Obtener URL de auth Google', description: 'Devuelve la URL de autorización de Google para construir un enlace desde frontend.' })
  @ApiQuery({ name: 'state', required: false, description: 'Valor opaco para mantener estado en el flujo' })
  @Get('auth-url')
  @Public()
  async getAuthUrl(@Query('state') state?: string): Promise<GoogleAuthUrlResponseDto> {
    try {
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleAuthConfig.clientId}&` +
        `redirect_uri=${encodeURIComponent(googleAuthConfig.callbackUrl)}&` +
        `scope=${googleAuthConfig.scope.join(' ')}&` +
        `response_type=code&` +
        `state=${state || 'default'}`;

      return {
        authUrl: googleAuthUrl,
        state: state || 'default',
      };
    } catch (error) {
      this.logger.error(`Error generating auth URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate authentication URL');
    }
  }

  // ===== GESTIÓN DE PERFIL =====

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Perfil Google', description: 'Devuelve el perfil del usuario autenticado con GoogleAuthGuard.' })
  @Get('profile')
  @UseGuards(GoogleAuthGuard)
  async getProfile(@Req() req: Request): Promise<GoogleUserResponseDto> {
    try {
      const user = req.user as any;

      const googleUser = await this.googleUserService.findById(user._id);

      return {
        _id: (googleUser._id as any).toString(),
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.displayName || `${googleUser.firstName} ${googleUser.lastName}`,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        displayName: googleUser.displayName,
        avatarUrl: googleUser.avatarUrl,
        isGoogleUser: true,
        linkedUserId: googleUser.linkedUserId?.toString(),
        access_token: req.headers.authorization?.replace('Bearer ', '') || '',
        token_type: 'Bearer',
        expires_in: 604800, // 7 days
      };
    } catch (error) {
      this.logger.error(`Error getting Google user profile: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get user profile');
    }
  }

  // ===== VINCULAR CON USUARIO TRADICIONAL =====

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Vincular cuenta Google', description: 'Vincula una cuenta de Google a un usuario tradicional. Requiere token válido.' })
  @Post('link')
  @UseGuards(GoogleAuthGuard)
  async linkToTraditionalUser(
    @Req() req: Request,
    @Body('traditionalUserId') traditionalUserId: string,
  ): Promise<GoogleLinkResponseDto> {
    try {
      const user = req.user as any;

      if (!traditionalUserId) {
        throw new BadRequestException('Traditional user ID is required');
      }

      const linkedUser = await this.googleUserService.linkToTraditionalUser(
        user._id,
        traditionalUserId
      );

      this.logger.log(`Google user ${user._id} linked to traditional user ${traditionalUserId}`);

      return {
        message: 'Successfully linked Google account to traditional user',
        linked: true,
        user: {
          _id: (linkedUser._id as any).toString(),
          googleId: linkedUser.googleId,
          email: linkedUser.email,
          name: linkedUser.displayName || `${linkedUser.firstName} ${linkedUser.lastName}`,
          firstName: linkedUser.firstName,
          lastName: linkedUser.lastName,
          displayName: linkedUser.displayName,
          avatarUrl: linkedUser.avatarUrl,
          isGoogleUser: true,
          linkedUserId: linkedUser.linkedUserId?.toString(),
          access_token: req.headers.authorization?.replace('Bearer ', '') || '',
          token_type: 'Bearer',
          expires_in: 604800,
        },
      };
    } catch (error) {
      this.logger.error(`Error linking Google user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to link Google account');
    }
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Desvincular cuenta Google', description: 'Desvincula la cuenta Google del usuario tradicional.' })
  @Post('unlink')
  @UseGuards(GoogleAuthGuard)
  async unlinkFromTraditionalUser(@Req() req: Request): Promise<GoogleLinkResponseDto> {
    try {
      const user = req.user as any;

      const unlinkedUser = await this.googleUserService.unlinkFromTraditionalUser(user._id);

      this.logger.log(`Google user ${user._id} unlinked from traditional user`);

      return {
        message: 'Successfully unlinked Google account from traditional user',
        linked: false,
        user: {
          _id: (unlinkedUser._id as any).toString(),
          googleId: unlinkedUser.googleId,
          email: unlinkedUser.email,
          name: unlinkedUser.displayName || `${unlinkedUser.firstName} ${unlinkedUser.lastName}`,
          firstName: unlinkedUser.firstName,
          lastName: unlinkedUser.lastName,
          displayName: unlinkedUser.displayName,
          avatarUrl: unlinkedUser.avatarUrl,
          isGoogleUser: true,
          linkedUserId: undefined,
          access_token: req.headers.authorization?.replace('Bearer ', '') || '',
          token_type: 'Bearer',
          expires_in: 604800,
        },
      };
    } catch (error) {
      this.logger.error(`Error unlinking Google user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to unlink Google account');
    }
  }

  // ===== GESTIÓN DE PERFIL COMPLETO =====

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Perfil completo', description: 'Devuelve perfil extendido del usuario de Google, con preferencias y datos adicionales.' })
  @Get('profile/complete')
  @UseGuards(GoogleAuthGuard)
  async getCompleteProfile(@Req() req: Request) {
    try {
      const user = req.user as any;
      const googleUser = await this.googleUserService.findById(user._id);

      return {
        success: true,
        data: {
          _id: (googleUser._id as any).toString(),
          googleId: googleUser.googleId,
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          displayName: googleUser.displayName,
          avatarUrl: googleUser.avatarUrl,
          phone: googleUser.phone,
          alternativeEmail: googleUser.alternativeEmail,
          addresses: googleUser.addresses,
          preferredShippingMethod: googleUser.preferredShippingMethod,
          allowWeekendDelivery: googleUser.allowWeekendDelivery,
          allowEveningDelivery: googleUser.allowEveningDelivery,
          requiresInvoice: googleUser.requiresInvoice,
          taxId: googleUser.taxId,
          companyName: googleUser.companyName,
          emailNotifications: googleUser.emailNotifications,
          orderNotifications: googleUser.orderNotifications,
          shippingNotifications: googleUser.shippingNotifications,
          promotionNotifications: googleUser.promotionNotifications,
          smsNotifications: googleUser.smsNotifications,
          allowDataProcessing: googleUser.allowDataProcessing,
          allowMarketingEmails: googleUser.allowMarketingEmails,
          allowDataSharing: googleUser.allowDataSharing,
          preferredLanguage: googleUser.preferredLanguage,
          locale: googleUser.locale,
          timezone: googleUser.timezone,
          isGoogleUser: true,
          linkedUserId: googleUser.linkedUserId?.toString(),
          createdAt: googleUser.createdAt,
          lastLoginAt: googleUser.lastLoginAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting complete profile: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get complete profile');
    }
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar perfil Google', description: 'Actualiza el perfil almacenado para el usuario de Google.' })
  @Put('profile')
  @UseGuards(GoogleAuthGuard)
  async updateProfile(
    @Req() req: Request,
    @Body() profileData: any,
  ): Promise<{ message: string; data: any }> {
    try {
      const user = req.user as any;

      const updatedUser = await this.googleUserService.updateGoogleUser(user._id, profileData);

      this.logger.log(`Profile updated for Google user: ${user._id}`);

      return {
        message: 'Profile updated successfully',
        data: {
          _id: (updatedUser._id as any).toString(),
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          alternativeEmail: updatedUser.alternativeEmail,
          addresses: updatedUser.addresses,
          preferredShippingMethod: updatedUser.preferredShippingMethod,
          allowWeekendDelivery: updatedUser.allowWeekendDelivery,
          allowEveningDelivery: updatedUser.allowEveningDelivery,
          requiresInvoice: updatedUser.requiresInvoice,
          taxId: updatedUser.taxId,
          companyName: updatedUser.companyName,
          emailNotifications: updatedUser.emailNotifications,
          orderNotifications: updatedUser.orderNotifications,
          shippingNotifications: updatedUser.shippingNotifications,
          promotionNotifications: updatedUser.promotionNotifications,
          smsNotifications: updatedUser.smsNotifications,
          allowDataProcessing: updatedUser.allowDataProcessing,
          allowMarketingEmails: updatedUser.allowMarketingEmails,
          allowDataSharing: updatedUser.allowDataSharing,
          preferredLanguage: updatedUser.preferredLanguage,
          timezone: updatedUser.timezone,
        },
      };
    } catch (error) {
      this.logger.error(`Error updating profile: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  // ===== GESTIÓN DE DIRECCIONES =====

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Agregar dirección', description: 'Agrega una dirección para el usuario Google. Si es la primera, queda como default.' })
  @Post('addresses')
  @UseGuards(GoogleAuthGuard)
  async addAddress(
    @Req() req: Request,
    @Body() addressData: any,
  ): Promise<{ message: string; address: any }> {
    try {
      const user = req.user as any;
      const googleUser = await this.googleUserService.findById(user._id);

      const newAddress = {
        ...addressData,
        _id: new Date().getTime().toString(), // ID temporal
        createdAt: new Date(),
      };

      // Si es la primera dirección, marcarla como default
      if (googleUser.addresses.length === 0) {
        newAddress.isDefault = true;
      }

      // Si se marca como default, quitar default de las demás
      if (newAddress.isDefault) {
        googleUser.addresses.forEach(addr => addr.isDefault = false);
      }

      googleUser.addresses.push(newAddress);
      await googleUser.save();

      this.logger.log(`Address added for Google user: ${user._id}`);

      return {
        message: 'Address added successfully',
        address: newAddress,
      };
    } catch (error) {
      this.logger.error(`Error adding address: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to add address');
    }
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar dirección', description: 'Actualiza una dirección existente. Si se marca como default, desmarca las demás.' })
  @Put('addresses/:addressId')
  @UseGuards(GoogleAuthGuard)
  async updateAddress(
    @Req() req: Request,
    @Body() addressData: any,
    @Query('addressId') addressId: string,
  ): Promise<{ message: string; address: any }> {
    try {
      const user = req.user as any;
      const googleUser = await this.googleUserService.findById(user._id);

      const addressIndex = googleUser.addresses.findIndex(addr => addr._id === addressId);
      if (addressIndex === -1) {
        throw new BadRequestException('Address not found');
      }

      // Si se marca como default, quitar default de las demás
      if (addressData.isDefault) {
        googleUser.addresses.forEach(addr => addr.isDefault = false);
      }

      googleUser.addresses[addressIndex] = {
        ...googleUser.addresses[addressIndex],
        ...addressData,
      };

      await googleUser.save();

      this.logger.log(`Address updated for Google user: ${user._id}`);

      return {
        message: 'Address updated successfully',
        address: googleUser.addresses[addressIndex],
      };
    } catch (error) {
      this.logger.error(`Error updating address: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update address');
    }
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Eliminar dirección', description: 'Elimina una dirección y ajusta default si corresponde.' })
  @Delete('addresses/:addressId')
  @UseGuards(GoogleAuthGuard)
  async deleteAddress(
    @Req() req: Request,
    @Query('addressId') addressId: string,
  ): Promise<{ message: string }> {
    try {
      const user = req.user as any;
      const googleUser = await this.googleUserService.findById(user._id);

      const addressIndex = googleUser.addresses.findIndex(addr => addr._id === addressId);
      if (addressIndex === -1) {
        throw new BadRequestException('Address not found');
      }

      const wasDefault = googleUser.addresses[addressIndex].isDefault;
      googleUser.addresses.splice(addressIndex, 1);

      // Si se eliminó la dirección default, marcar otra como default
      if (wasDefault && googleUser.addresses.length > 0) {
        googleUser.addresses[0].isDefault = true;
      }

      await googleUser.save();

      this.logger.log(`Address deleted for Google user: ${user._id}`);

      return {
        message: 'Address deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting address: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete address');
    }
  }

  // ===== ACTUALIZAR PREFERENCIAS =====

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar preferencias', description: 'Actualiza preferencias del usuario de Google.' })
  @Post('preferences')
  @UseGuards(GoogleAuthGuard)
  async updatePreferences(
    @Req() req: Request,
    @Body() preferences: any,
  ): Promise<{ message: string }> {
    try {
      const user = req.user as any;

      await this.googleUserService.updateGoogleUser(user._id, preferences);

      this.logger.log(`Preferences updated for Google user: ${user._id}`);

      return {
        message: 'Preferences updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating preferences: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update preferences');
    }
  }

  // ===== LOGOUT =====

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Logout Google', description: 'Finaliza sesión y limpia cookies de autenticación.' })
  @Post('logout')
  @UseGuards(GoogleAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      this.logger.log(`Google user logged out: ${req.user?.['_id']}`);

      // Limpiar cookies de autenticación
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      res.clearCookie('user_data', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      res.status(HttpStatus.OK).json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      this.logger.error(`Error during logout: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to logout');
    }
  }

  // ===== ESTADÍSTICAS (Solo para desarrollo/testing) =====

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Estadísticas (dev)', description: 'Estadísticas internas para desarrollo.' })
  @Get('stats')
  @UseGuards(GoogleAuthGuard)
  async getStats(@Req() req: Request) {
    try {
      const stats = await this.googleUserService.getUserStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Error getting stats: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get statistics');
    }
  }
}
