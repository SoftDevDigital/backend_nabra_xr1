import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: updateProfileDto },
        { new: true, runValidators: true },
      )
      .select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  async updateUserRole(
    userId: string,
    updateRoleDto: UpdateRoleDto,
    requester: User,
  ): Promise<User> {
    if (requester.role !== 'admin') {
      throw new ForbiddenException('Only admins can update roles');
    }
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { role: updateRoleDto.role } },
        { new: true, runValidators: true },
      )
      .select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async deleteUser(userId: string, requester: User): Promise<void> {
    if (requester.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete users');
    }
    const user = await this.userModel.findByIdAndDelete(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }
}
