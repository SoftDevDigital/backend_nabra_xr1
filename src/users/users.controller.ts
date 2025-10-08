import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../auth/schemas/user.schema';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ApiOperation({ summary: 'Obtener mi perfil', description: 'Retorna el perfil del usuario autenticado.' })
  @Get('profile')
  async getProfile(@Request() req): Promise<User> {
    return this.usersService.getProfile(req.user.userId);
  }

  @ApiOperation({ summary: 'Actualizar mi perfil', description: 'Actualiza los datos del perfil del usuario autenticado.' })
  @Put('profile')
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Listar usuarios (admin)', description: 'Obtiene todos los usuarios. Solo administradores.' })
  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.usersService.getAllUsers();
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar rol (admin)', description: 'Actualiza el rol de un usuario por ID.' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @Put(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req,
  ): Promise<User> {
    return this.usersService.updateUserRole(id, updateRoleDto, req.user);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar usuario (admin)', description: 'Elimina un usuario por ID.' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Request() req): Promise<void> {
    return this.usersService.deleteUser(id, req.user);
  }
}
