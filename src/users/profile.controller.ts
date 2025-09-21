import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { CreateAddressDto } from './dtos/create-address.dto';
import { UpdateAddressDto } from './dtos/update-address.dto';
import { AddressType } from './schemas/address.schema';

@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  // ===== GESTIÓN DE PERFIL =====

  @Get()
  async getProfile(@Request() req) {
    return this.profileService.getProfile(req.user.userId);
  }

  @Put()
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Get('stats')
  async getProfileStats(@Request() req) {
    return this.profileService.getProfileStats(req.user.userId);
  }

  // ===== VERIFICACIONES =====

  @Post('verify/email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Request() req) {
    await this.profileService.verifyEmail(req.user.userId);
    return { message: 'Email verified successfully' };
  }

  @Post('verify/phone')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@Request() req) {
    await this.profileService.verifyPhone(req.user.userId);
    return { message: 'Phone verified successfully' };
  }

  @Post('verify/identity')
  @HttpCode(HttpStatus.OK)
  async verifyIdentity(@Request() req) {
    await this.profileService.verifyIdentity(req.user.userId);
    return { message: 'Identity verified successfully' };
  }

  // ===== GESTIÓN DE DIRECCIONES =====

  @Get('addresses')
  async getUserAddresses(@Request() req, @Query('type') type?: string) {
    if (type) {
      if (!Object.values(AddressType).includes(type as AddressType)) {
        throw new BadRequestException('Invalid address type');
      }
      return this.profileService.getAddressesByType(req.user.userId, type as AddressType);
    }
    return this.profileService.getUserAddresses(req.user.userId);
  }

  @Get('addresses/:addressId')
  async getAddressById(@Request() req, @Param('addressId') addressId: string) {
    return this.profileService.getAddressById(req.user.userId, addressId);
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(@Request() req, @Body() createAddressDto: CreateAddressDto) {
    return this.profileService.createAddress(req.user.userId, createAddressDto);
  }

  @Put('addresses/:addressId')
  async updateAddress(
    @Request() req,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.profileService.updateAddress(req.user.userId, addressId, updateAddressDto);
  }

  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@Request() req, @Param('addressId') addressId: string) {
    await this.profileService.deleteAddress(req.user.userId, addressId);
  }

  @Post('addresses/:addressId/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefaultAddress(@Request() req, @Param('addressId') addressId: string) {
    return this.profileService.setDefaultAddress(req.user.userId, addressId);
  }

  // ===== ENDPOINTS ESPECÍFICOS PARA DRENVÍO =====

  @Get('shipping-info')
  async getShippingInfo(@Request() req) {
    const profile = await this.profileService.getProfile(req.user.userId);
    const addresses = await this.profileService.getUserAddresses(req.user.userId);
    
    return {
      personalInfo: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumbers: profile.phoneNumbers,
        documents: profile.documents,
      },
      addresses: addresses.map(addr => ({
        id: addr._id,
        alias: addr.alias,
        fullAddress: `${addr.street}, ${addr.neighborhood}, ${addr.city}, ${addr.state} ${addr.postalCode}`,
        receiverName: addr.receiverName || `${profile.firstName} ${profile.lastName}`,
        receiverPhone: addr.receiverPhone || profile.phoneNumbers.find(p => p.isPrimary)?.number,
        references: addr.references,
        coordinates: addr.coordinates,
        drEnvioData: addr.drEnvioData,
        isDefault: addr.isDefault,
      })),
      drEnvioProfile: profile.drEnvioProfile,
    };
  }

  @Get('addresses/:addressId/drenvio-validation')
  async validateAddressWithDrEnvio(@Request() req, @Param('addressId') addressId: string) {
    const address = await this.profileService.getAddressById(req.user.userId, addressId);
    
    // TODO: Integrar con DrEnvío API para validar dirección
    return {
      address: {
        id: address._id,
        fullAddress: `${address.street}, ${address.neighborhood}, ${address.city}, ${address.state}`,
        postalCode: address.postalCode,
      },
      validation: {
        isValid: address.isValidatedByDrEnvio,
        zoneId: address.drEnvioZoneId,
        deliveryOptions: address.drEnvioData,
        message: address.isValidatedByDrEnvio 
          ? 'Address validated successfully' 
          : 'Address validation pending'
      }
    };
  }

  // ===== ENDPOINTS PARA COMPLETAR PERFIL =====

  @Get('completion-guide')
  async getCompletionGuide(@Request() req) {
    const profile = await this.profileService.getProfile(req.user.userId);
    const addresses = await this.profileService.getUserAddresses(req.user.userId);
    
    const steps = [
      {
        step: 1,
        title: 'Información Personal',
        completed: !!(profile.firstName && profile.lastName && profile.dateOfBirth),
        fields: ['firstName', 'lastName', 'dateOfBirth'],
      },
      {
        step: 2,
        title: 'Información de Contacto',
        completed: profile.phoneNumbers.length > 0,
        fields: ['phoneNumbers'],
      },
      {
        step: 3,
        title: 'Documento de Identidad',
        completed: profile.documents.length > 0,
        fields: ['documents'],
      },
      {
        step: 4,
        title: 'Dirección de Envío',
        completed: addresses.length > 0,
        fields: ['addresses'],
      },
      {
        step: 5,
        title: 'Contacto de Emergencia',
        completed: profile.emergencyContacts.length > 0,
        fields: ['emergencyContacts'],
      },
      {
        step: 6,
        title: 'Verificaciones',
        completed: profile.isEmailVerified && profile.isPhoneVerified,
        fields: ['emailVerification', 'phoneVerification'],
      },
    ];

    const completedSteps = steps.filter(step => step.completed).length;
    const completionPercentage = Math.round((completedSteps / steps.length) * 100);

    return {
      completionPercentage,
      completedSteps,
      totalSteps: steps.length,
      steps,
      nextStep: steps.find(step => !step.completed) || null,
    };
  }
}
