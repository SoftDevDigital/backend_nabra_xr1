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

@Controller('auth/google')
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private googleUserService: GoogleUserService,
    private jwtService: JwtService,
  ) {}

  // ===== INICIO DE SESIÓN CON GOOGLE =====

  @Public()
  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    // Este endpoint redirige a Google OAuth
    // La lógica se maneja en la estrategia de Google
  }

  @Public()
  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as any;

      if (!user) {
        this.logger.error('No user data received from Google OAuth');
        return res.redirect(`https://nabra.mx/login?error=no_user_data`);
      }

      // Generar JWT token
      const payload = {
        sub: user._id,
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        isGoogleUser: true,
        linkedUserId: user.linkedUserId,
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

      // Redirigir al frontend con el token y datos del usuario
      const userData = {
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isGoogleUser: true,
        linkedUserId: user.linkedUserId,
      };

      // Crear URL con parámetros para el frontend - HARDCODED
      const redirectUrl = `https://nabra.mx/?token=${accessToken}&user=${encodeURIComponent(JSON.stringify(userData))}&login=success`;

      return res.redirect(redirectUrl);

    } catch (error) {
      this.logger.error(`Google OAuth callback error: ${error.message}`, error.stack);
      return res.redirect(`https://nabra.mx/login?error=server_error`);
    }
  }

  // ===== OBTENER URL DE AUTENTICACIÓN =====

  @Public()
  @Get('auth-url')
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

  @Post('logout')
  @UseGuards(GoogleAuthGuard)
  async logout(@Req() req: Request): Promise<{ message: string }> {
    try {
      // En un sistema real, aquí podrías invalidar el token JWT
      // o agregarlo a una lista negra
      this.logger.log(`Google user logged out: ${req.user?.['_id']}`);

      return {
        message: 'Logged out successfully',
      };
    } catch (error) {
      this.logger.error(`Error during logout: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to logout');
    }
  }

  // ===== ESTADÍSTICAS (Solo para desarrollo/testing) =====

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
