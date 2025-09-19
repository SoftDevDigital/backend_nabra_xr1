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

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req): Promise<User> {
    return this.usersService.getProfile(req.user.userId);
  }

  @Put('profile')
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Roles('admin')
  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.usersService.getAllUsers();
  }

  @Roles('admin')
  @Put(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req,
  ): Promise<User> {
    return this.usersService.updateUserRole(id, updateRoleDto, req.user);
  }

  @Roles('admin')
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Request() req): Promise<void> {
    return this.usersService.deleteUser(id, req.user);
  }
}
