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
import { CreateAddressDto, UpdateAddressDto } from './dtos/address.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Profile')
@ApiBearerAuth('bearer')
@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  // ===== GESTIÓN DE PERFIL =====

  @ApiOperation({ summary: 'Obtener mi perfil', description: 'Devuelve el perfil del usuario autenticado.' })
  @Get()
  async getProfile(@Request() req) {
    return this.profileService.getProfile(req.user.userId);
  }

  @ApiOperation({ summary: 'Actualizar mi perfil', description: 'Actualiza los datos del perfil del usuario autenticado.' })
  @Put()
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.userId, updateProfileDto);
  }

  @ApiOperation({ summary: 'Estadísticas de perfil', description: 'Métricas básicas del perfil.' })
  @Get('stats')
  async getProfileStats(@Request() req) {
    return this.profileService.getProfileStats(req.user.userId);
  }

  // ===== VERIFICACIONES =====

  @ApiOperation({ summary: 'Verificar email', description: 'Marca el email como verificado.' })
  @Post('verify/email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Request() req) {
    await this.profileService.verifyEmail(req.user.userId);
    return { message: 'Email verified successfully' };
  }

  @ApiOperation({ summary: 'Verificar teléfono', description: 'Marca el teléfono como verificado.' })
  @Post('verify/phone')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@Request() req) {
    await this.profileService.verifyPhone(req.user.userId);
    return { message: 'Phone verified successfully' };
  }

  @ApiOperation({ summary: 'Verificar identidad', description: 'Marca la identidad como verificada.' })
  @Post('verify/identity')
  @HttpCode(HttpStatus.OK)
  async verifyIdentity(@Request() req) {
    await this.profileService.verifyIdentity(req.user.userId);
    return { message: 'Identity verified successfully' };
  }

  // ===== GESTIÓN DE DIRECCIONES =====

  @ApiOperation({ summary: 'Listar direcciones', description: 'Lista las direcciones del usuario, opcionalmente filtradas por tipo.' })
  @ApiQuery({ name: 'type', required: false, description: 'Tipo de dirección' })
  @Get('addresses')
  async getUserAddresses(@Request() req, @Query('type') type?: string) {
    // Por ahora solo retornamos todas las direcciones
    return this.profileService.getUserAddresses(req.user.userId);
  }

  @ApiOperation({ summary: 'Obtener dirección', description: 'Devuelve una dirección por ID.' })
  @ApiParam({ name: 'addressId', description: 'ID de la dirección' })
  @Get('addresses/:addressId')
  async getAddressById(@Request() req, @Param('addressId') addressId: string) {
    return this.profileService.getAddressById(req.user.userId, addressId);
  }

  @ApiOperation({ summary: 'Crear dirección', description: 'Crea una nueva dirección para el usuario.' })
  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(@Request() req, @Body() createAddressDto: CreateAddressDto) {
    return this.profileService.createAddress(req.user.userId, createAddressDto);
  }

  @ApiOperation({ summary: 'Actualizar dirección', description: 'Actualiza una dirección existente.' })
  @ApiParam({ name: 'addressId', description: 'ID de la dirección' })
  @Put('addresses/:addressId')
  async updateAddress(
    @Request() req,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.profileService.updateAddress(req.user.userId, addressId, updateAddressDto);
  }

  @ApiOperation({ summary: 'Eliminar dirección', description: 'Elimina una dirección por ID.' })
  @ApiParam({ name: 'addressId', description: 'ID de la dirección' })
  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@Request() req, @Param('addressId') addressId: string) {
    await this.profileService.deleteAddress(req.user.userId, addressId);
  }

  @ApiOperation({ summary: 'Marcar como default', description: 'Marca una dirección como la predeterminada.' })
  @ApiParam({ name: 'addressId', description: 'ID de la dirección' })
  @Post('addresses/:addressId/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefaultAddress(@Request() req, @Param('addressId') addressId: string) {
    return this.profileService.setDefaultAddress(req.user.userId, addressId);
  }

  // ===== ENDPOINTS ESPECÍFICOS PARA DRENVÍO =====

  @ApiOperation({ summary: 'Información de envío', description: 'Devuelve datos de perfil útiles para el flujo de envíos.' })
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
        id: (addr as any)._id,
        alias: addr.name,
        fullAddress: `${addr.street}, ${addr.street2 || ''}, ${addr.city}, ${addr.state} ${addr.postalCode}`,
        receiverName: addr.contactName || `${profile.firstName} ${profile.lastName}`,
        receiverPhone: addr.contactPhone || profile.phoneNumbers.find(p => p.isPrimary)?.number,
        references: addr.instructions,
        coordinates: null,
        drEnvioData: null,
        isDefault: addr.isDefault,
      })),
      drEnvioProfile: profile.drEnvioProfile,
    };
  }

  @ApiOperation({ summary: 'Validar dirección con DrEnvío', description: 'Devuelve estado y metadatos de validación de dirección.' })
  @ApiParam({ name: 'addressId', description: 'ID de la dirección' })
  @Get('addresses/:addressId/drenvio-validation')
  async validateAddressWithDrEnvio(@Request() req, @Param('addressId') addressId: string) {
    const address = await this.profileService.getAddressById(req.user.userId, addressId);
    
    // TODO: Integrar con DrEnvío API para validar dirección
    return {
      address: {
        id: (address as any)._id,
        fullAddress: `${address.street}, ${address.street2 || ''}, ${address.city}, ${address.state}`,
        postalCode: address.postalCode,
      },
      validation: {
        isValid: true, // Por ahora siempre válido
        zoneId: null,
        deliveryOptions: null,
        message: 'Address validation pending'
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
