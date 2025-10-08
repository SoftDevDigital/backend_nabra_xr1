import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AddressService } from '../services/address.service';
import { 
  CreateAddressDto, 
  UpdateAddressDto, 
  SelectAddressDto, 
  AddressResponseDto 
} from '../dtos/address.dto';

@ApiTags('User Addresses')
@Controller('addresses')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Crear nueva dirección de envío',
    description: 'Crea una nueva dirección de envío. El usuario puede elegir si guardarla para futuros envíos o usarla solo para esta ocasión.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Dirección creada exitosamente',
    type: AddressResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de dirección inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async createAddress(
    @Request() req: any,
    @Body() createAddressDto: CreateAddressDto
  ): Promise<AddressResponseDto> {
    const userId = req.user.sub;
    return this.addressService.createAddress(userId, createAddressDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Obtener direcciones del usuario',
    description: 'Retorna todas las direcciones guardadas del usuario, ordenadas por dirección principal primero'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de direcciones obtenida exitosamente',
    type: [AddressResponseDto]
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getUserAddresses(@Request() req: any): Promise<AddressResponseDto[]> {
    const userId = req.user.sub;
    return this.addressService.getUserAddresses(userId);
  }

  @Get('default')
  @ApiOperation({ 
    summary: 'Obtener dirección principal',
    description: 'Retorna la dirección marcada como principal por defecto del usuario'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Dirección principal obtenida exitosamente',
    type: AddressResponseDto
  })
  @ApiResponse({ status: 404, description: 'No se encontró dirección principal' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getDefaultAddress(@Request() req: any): Promise<AddressResponseDto | null> {
    const userId = req.user.sub;
    return this.addressService.getDefaultAddress(userId);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener dirección específica',
    description: 'Retorna una dirección específica por su ID'
  })
  @ApiParam({ name: 'id', description: 'ID de la dirección' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dirección obtenida exitosamente',
    type: AddressResponseDto
  })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getAddressById(
    @Request() req: any,
    @Param('id') addressId: string
  ): Promise<AddressResponseDto> {
    const userId = req.user.sub;
    return this.addressService.getAddressById(userId, addressId);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Actualizar dirección existente',
    description: 'Actualiza una dirección existente. Si se marca como principal, automáticamente quita el estado principal de otras direcciones.'
  })
  @ApiParam({ name: 'id', description: 'ID de la dirección a actualizar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dirección actualizada exitosamente',
    type: AddressResponseDto
  })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos de dirección inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateAddress(
    @Request() req: any,
    @Param('id') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto
  ): Promise<AddressResponseDto> {
    const userId = req.user.sub;
    return this.addressService.updateAddress(userId, addressId, updateAddressDto);
  }

  @Put(':id/set-default')
  @ApiOperation({ 
    summary: 'Establecer dirección como principal',
    description: 'Marca una dirección específica como la dirección principal por defecto'
  })
  @ApiParam({ name: 'id', description: 'ID de la dirección a establecer como principal' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dirección establecida como principal exitosamente',
    type: AddressResponseDto
  })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async setDefaultAddress(
    @Request() req: any,
    @Param('id') addressId: string
  ): Promise<AddressResponseDto> {
    const userId = req.user.sub;
    return this.addressService.setDefaultAddress(userId, addressId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Eliminar dirección',
    description: 'Elimina una dirección (soft delete). Si era la dirección principal, automáticamente marca otra como principal.'
  })
  @ApiParam({ name: 'id', description: 'ID de la dirección a eliminar' })
  @ApiResponse({ status: 204, description: 'Dirección eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Dirección no encontrada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async deleteAddress(
    @Request() req: any,
    @Param('id') addressId: string
  ): Promise<void> {
    const userId = req.user.sub;
    return this.addressService.deleteAddress(userId, addressId);
  }

  @Post('validate')
  @ApiOperation({ 
    summary: 'Validar datos de dirección para envío',
    description: 'Valida que los datos de una dirección sean correctos para realizar un envío'
  })
  @ApiResponse({ status: 200, description: 'Dirección válida para envío' })
  @ApiResponse({ status: 400, description: 'Datos de dirección inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async validateAddressForShipping(
    @Request() req: any,
    @Body() addressData: any
  ): Promise<{ valid: boolean; message: string }> {
    const userId = req.user.sub;
    await this.addressService.validateAddressForShipping(addressData);
    return { valid: true, message: 'Dirección válida para envío' };
  }
}
