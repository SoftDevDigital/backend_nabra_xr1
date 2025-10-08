import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address, AddressDocument } from '../schemas/address.schema';
import { CreateAddressDto, UpdateAddressDto, AddressResponseDto } from '../dtos/address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
  ) {}

  async createAddress(userId: string, createAddressDto: CreateAddressDto): Promise<AddressResponseDto> {
    const { saveAddress = true, isDefault = false, ...addressData } = createAddressDto;

    // Si se marca como default, quitar default de otras direcciones
    if (isDefault) {
      await this.addressModel.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    // Si no se va a guardar, solo retornar los datos sin persistir
    if (!saveAddress) {
      return {
        _id: 'temp',
        ...addressData,
        userId,
        isDefault,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AddressResponseDto;
    }

    const address = new this.addressModel({
      ...addressData,
      userId,
      isDefault,
      country: addressData.country || 'México',
    });

    const savedAddress = await address.save();
    return this.mapToResponseDto(savedAddress);
  }

  async getUserAddresses(userId: string): Promise<AddressResponseDto[]> {
    const addresses = await this.addressModel
      .find({ userId, isActive: true })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();

    return addresses.map(address => this.mapToResponseDto(address));
  }

  async getAddressById(userId: string, addressId: string): Promise<AddressResponseDto> {
    const address = await this.addressModel.findOne({
      _id: addressId,
      userId,
      isActive: true,
    }).exec();

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    return this.mapToResponseDto(address);
  }

  async updateAddress(
    userId: string, 
    addressId: string, 
    updateAddressDto: UpdateAddressDto
  ): Promise<AddressResponseDto> {
    const address = await this.addressModel.findOne({
      _id: addressId,
      userId,
      isActive: true,
    }).exec();

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    // Si se marca como default, quitar default de otras direcciones
    if (updateAddressDto.isDefault) {
      await this.addressModel.updateMany(
        { userId, isDefault: true, _id: { $ne: addressId } },
        { isDefault: false }
      );
    }

    Object.assign(address, updateAddressDto);
    const updatedAddress = await address.save();

    return this.mapToResponseDto(updatedAddress);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.addressModel.findOne({
      _id: addressId,
      userId,
      isActive: true,
    }).exec();

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    // Soft delete
    address.isActive = false;
    await address.save();

    // Si era la dirección por defecto, marcar otra como default
    if (address.isDefault) {
      const nextDefault = await this.addressModel
        .findOne({ userId, isActive: true, _id: { $ne: addressId } })
        .exec();
      
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<AddressResponseDto> {
    const address = await this.addressModel.findOne({
      _id: addressId,
      userId,
      isActive: true,
    }).exec();

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    // Quitar default de otras direcciones
    await this.addressModel.updateMany(
      { userId, isDefault: true },
      { isDefault: false }
    );

    // Marcar como default
    address.isDefault = true;
    const updatedAddress = await address.save();

    return this.mapToResponseDto(updatedAddress);
  }

  async getDefaultAddress(userId: string): Promise<AddressResponseDto | null> {
    const address = await this.addressModel
      .findOne({ userId, isDefault: true, isActive: true })
      .exec();

    return address ? this.mapToResponseDto(address) : null;
  }

  async validateAddressForShipping(addressData: any): Promise<boolean> {
    const requiredFields = [
      'street', 'city', 'state', 'postalCode', 
      'contactName', 'contactPhone'
    ];

    for (const field of requiredFields) {
      if (!addressData[field] || addressData[field].trim() === '') {
        throw new BadRequestException(`El campo ${field} es requerido para el envío`);
      }
    }

    // Validar formato de código postal
    if (!/^\d{5}$/.test(addressData.postalCode)) {
      throw new BadRequestException('El código postal debe tener exactamente 5 dígitos');
    }

    // Validar formato de teléfono
    if (!/^\d{10}$/.test(addressData.contactPhone)) {
      throw new BadRequestException('El teléfono debe tener exactamente 10 dígitos');
    }

    return true;
  }

  private mapToResponseDto(address: AddressDocument): AddressResponseDto {
    return {
      _id: (address._id as any).toString(),
      name: address.name,
      street: address.street,
      street2: address.street2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      instructions: address.instructions,
      isDefault: address.isDefault,
      isActive: address.isActive,
      createdAt: (address as any).createdAt || new Date(),
      updatedAt: (address as any).updatedAt || new Date(),
    };
  }
}
