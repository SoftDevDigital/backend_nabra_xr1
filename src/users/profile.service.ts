import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfile } from './schemas/user-profile.schema';
import { Address, AddressType } from './schemas/address.schema';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { CreateAddressDto } from './dtos/create-address.dto';
import { UpdateAddressDto } from './dtos/update-address.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectModel(UserProfile.name) private profileModel: Model<UserProfile>,
    @InjectModel(Address.name) private addressModel: Model<Address>,
  ) {}

  // ===== GESTIÓN DE PERFILES =====

  async getProfile(userId: string): Promise<UserProfile> {
    let profile = await this.profileModel.findOne({ userId }).exec();
    
    if (!profile) {
      // Crear perfil básico si no existe
      profile = await this.createBasicProfile(userId);
    }
    
    return profile as UserProfile;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserProfile> {
    try {
      // Verificar si hay documentos duplicados
      if (updateProfileDto.documents) {
        await this.validateDocuments(userId, updateProfileDto.documents);
      }

      // Verificar si hay teléfonos duplicados
      if (updateProfileDto.phoneNumbers) {
        await this.validatePhoneNumbers(userId, updateProfileDto.phoneNumbers);
      }

      const updatedProfile = await this.profileModel.findOneAndUpdate(
        { userId },
        { $set: updateProfileDto },
        { new: true, upsert: true, runValidators: true }
      ).exec();

      this.logger.log(`Profile updated for user: ${userId}`);
      return updatedProfile;
    } catch (error) {
      this.logger.error('Error updating profile:', error);
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update profile: ${error.message}`);
    }
  }

  async getProfileStats(userId: string): Promise<any> {
    const profile = await this.getProfile(userId);
    const addresses = await this.getUserAddresses(userId);
    
    return {
      profileCompleteness: this.calculateProfileCompleteness(profile),
      verificationStatus: {
        email: profile.isEmailVerified,
        phone: profile.isPhoneVerified,
        identity: profile.isIdentityVerified,
        address: profile.isAddressVerified,
      },
      addressCount: addresses.length,
      stats: profile.stats || {},
    };
  }

  // ===== GESTIÓN DE DIRECCIONES =====

  async getUserAddresses(userId: string): Promise<Address[]> {
    return this.addressModel.find({ userId, isActive: true }).sort({ isDefault: -1, createdAt: -1 }).exec();
  }

  async getAddressById(userId: string, addressId: string): Promise<Address> {
    const address = await this.addressModel.findOne({ _id: addressId, userId, isActive: true }).exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async createAddress(userId: string, createAddressDto: CreateAddressDto): Promise<Address> {
    try {
      // Si es dirección por defecto, desmarcar otras
      if (createAddressDto.isDefault) {
        await this.addressModel.updateMany(
          { userId, isDefault: true },
          { $set: { isDefault: false } }
        );
      }

      // Si es la primera dirección, hacerla por defecto automáticamente
      const existingAddresses = await this.addressModel.countDocuments({ userId, isActive: true });
      if (existingAddresses === 0) {
        createAddressDto.isDefault = true;
      }

      const address = new this.addressModel({
        ...createAddressDto,
        userId,
      });

      await address.save();
      this.logger.log(`Address created for user: ${userId}`);
      return address;
    } catch (error) {
      this.logger.error('Error creating address:', error);
      throw new BadRequestException(`Failed to create address: ${error.message}`);
    }
  }

  async updateAddress(userId: string, addressId: string, updateAddressDto: UpdateAddressDto): Promise<Address> {
    try {
      const address = await this.getAddressById(userId, addressId);

      // Si se marca como por defecto, desmarcar otras
      if (updateAddressDto.isDefault) {
        await this.addressModel.updateMany(
          { userId, isDefault: true, _id: { $ne: addressId } },
          { $set: { isDefault: false } }
        );
      }

      Object.assign(address, updateAddressDto);
      await address.save();

      this.logger.log(`Address updated: ${addressId} for user: ${userId}`);
      return address;
    } catch (error) {
      this.logger.error('Error updating address:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update address: ${error.message}`);
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    try {
      const address = await this.getAddressById(userId, addressId);

      // No permitir eliminar la única dirección
      const activeAddresses = await this.addressModel.countDocuments({ userId, isActive: true });
      if (activeAddresses <= 1) {
        throw new BadRequestException('Cannot delete the only address. Add another address first.');
      }

      // Soft delete
      address.isActive = false;
      await address.save();

      // Si era la dirección por defecto, asignar otra como por defecto
      if (address.isDefault) {
        const nextAddress = await this.addressModel.findOne({ userId, isActive: true }).exec();
        if (nextAddress) {
          nextAddress.isDefault = true;
          await nextAddress.save();
        }
      }

      this.logger.log(`Address deleted: ${addressId} for user: ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting address:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete address: ${error.message}`);
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<Address> {
    try {
      const address = await this.getAddressById(userId, addressId);

      // Desmarcar todas las direcciones por defecto
      await this.addressModel.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
      );

      // Marcar la nueva como por defecto
      address.isDefault = true;
      await address.save();

      this.logger.log(`Default address set: ${addressId} for user: ${userId}`);
      return address;
    } catch (error) {
      this.logger.error('Error setting default address:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to set default address: ${error.message}`);
    }
  }

  async getAddressesByType(userId: string, type: AddressType): Promise<Address[]> {
    return this.addressModel.find({ userId, type, isActive: true }).exec();
  }

  // ===== VERIFICACIONES =====

  async verifyEmail(userId: string): Promise<void> {
    await this.profileModel.updateOne(
      { userId },
      { 
        $set: { 
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        }
      }
    );
    this.logger.log(`Email verified for user: ${userId}`);
  }

  async verifyPhone(userId: string): Promise<void> {
    await this.profileModel.updateOne(
      { userId },
      { 
        $set: { 
          isPhoneVerified: true,
          phoneVerifiedAt: new Date()
        }
      }
    );
    this.logger.log(`Phone verified for user: ${userId}`);
  }

  async verifyIdentity(userId: string): Promise<void> {
    await this.profileModel.updateOne(
      { userId },
      { 
        $set: { 
          isIdentityVerified: true,
          identityVerifiedAt: new Date()
        }
      }
    );
    this.logger.log(`Identity verified for user: ${userId}`);
  }

  // ===== MÉTODOS PRIVADOS =====

  private async createBasicProfile(userId: string): Promise<any> {
    const profile = new this.profileModel({
      userId,
      firstName: '',
      lastName: '',
      phoneNumbers: [],
      documents: [],
      emergencyContacts: [],
      preferences: {
        language: 'es',
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        promotionalEmails: false,
        twoFactorAuth: false,
      },
      stats: {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        memberSince: new Date(),
        loyaltyPoints: 0,
      },
    });

    await profile.save();
    return profile;
  }

  private async validateDocuments(userId: string, documents: any[]): Promise<void> {
    for (const doc of documents) {
      const existing = await this.profileModel.findOne({
        userId: { $ne: userId },
        'documents.type': doc.type,
        'documents.number': doc.number,
      });

      if (existing) {
        throw new ConflictException(`Document ${doc.type} with number ${doc.number} already exists`);
      }
    }
  }

  private async validatePhoneNumbers(userId: string, phoneNumbers: any[]): Promise<void> {
    for (const phone of phoneNumbers) {
      const fullNumber = `${phone.countryCode}${phone.number}`;
      const existing = await this.profileModel.findOne({
        userId: { $ne: userId },
        'phoneNumbers.countryCode': phone.countryCode,
        'phoneNumbers.number': phone.number,
      });

      if (existing) {
        throw new ConflictException(`Phone number ${fullNumber} already exists`);
      }
    }
  }

  private calculateProfileCompleteness(profile: UserProfile): number {
    const fields = [
      profile.firstName,
      profile.lastName,
      profile.dateOfBirth,
      profile.phoneNumbers?.length > 0,
      profile.documents?.length > 0,
      profile.emergencyContacts?.length > 0,
    ];

    const completedFields = fields.filter(field => !!field).length;
    return Math.round((completedFields / fields.length) * 100);
  }
}
