import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleUser, GoogleUserDocument } from '../schemas/google-user.schema';
import { CreateGoogleUserDto } from '../dtos/create-google-user.dto';
import { UpdateGoogleUserDto } from '../dtos/update-google-user.dto';

@Injectable()
export class GoogleUserService {
  private readonly logger = new Logger(GoogleUserService.name);

  constructor(
    @InjectModel(GoogleUser.name) private googleUserModel: Model<GoogleUserDocument>,
  ) {}

  // ===== CREACIÓN Y GESTIÓN DE USUARIOS =====

  async createGoogleUser(createDto: CreateGoogleUserDto): Promise<GoogleUser> {
    try {
      this.logger.log(`Creating Google user with email: ${createDto.email}`);

      // Verificar si ya existe un usuario con el mismo Google ID
      const existingUser = await this.googleUserModel.findOne({
        $or: [
          { googleId: createDto.googleId },
          { email: createDto.email }
        ]
      });

      if (existingUser) {
        if (existingUser.googleId === createDto.googleId) {
          throw new ConflictException('User with this Google ID already exists');
        }
        if (existingUser.email === createDto.email) {
          throw new ConflictException('User with this email already exists');
        }
      }

      const googleUser = new this.googleUserModel({
        ...createDto,
        firstLoginAt: new Date(),
        loginCount: 1,
        lastLoginAt: new Date(),
      });

      const savedUser = await googleUser.save();
      this.logger.log(`Google user created successfully: ${savedUser._id}`);
      
      return savedUser;
    } catch (error) {
      this.logger.error(`Error creating Google user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByGoogleId(googleId: string): Promise<GoogleUser | null> {
    try {
      return await this.googleUserModel.findOne({ 
        googleId,
        status: { $ne: 'deleted' }
      });
    } catch (error) {
      this.logger.error(`Error finding Google user by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<GoogleUser | null> {
    try {
      return await this.googleUserModel.findOne({ 
        email,
        status: { $ne: 'deleted' }
      });
    } catch (error) {
      this.logger.error(`Error finding Google user by email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<GoogleUser> {
    try {
      const user = await this.googleUserModel.findById(id);
      if (!user) {
        throw new NotFoundException('Google user not found');
      }
      return user;
    } catch (error) {
      this.logger.error(`Error finding Google user by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateGoogleUser(id: string, updateDto: UpdateGoogleUserDto): Promise<GoogleUser> {
    try {
      this.logger.log(`Updating Google user: ${id}`);

      const updatedUser = await this.googleUserModel.findByIdAndUpdate(
        id,
        { ...updateDto, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new NotFoundException('Google user not found');
      }

      this.logger.log(`Google user updated successfully: ${id}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating Google user: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===== GESTIÓN DE SESIONES Y LOGINS =====

  async incrementLoginCount(id: string): Promise<void> {
    try {
      await this.googleUserModel.findByIdAndUpdate(id, {
        $inc: { loginCount: 1 },
        lastLoginAt: new Date(),
        failedLoginAttempts: 0, // Reset failed attempts on successful login
      });
    } catch (error) {
      this.logger.error(`Error incrementing login count: ${error.message}`, error.stack);
      throw error;
    }
  }

  async incrementFailedLoginAttempts(id: string): Promise<void> {
    try {
      await this.googleUserModel.findByIdAndUpdate(id, {
        $inc: { failedLoginAttempts: 1 },
        lastFailedLoginAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error incrementing failed login attempts: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateUserActivity(id: string, ipAddress: string, userAgent: string): Promise<void> {
    try {
      await this.googleUserModel.findByIdAndUpdate(id, {
        $addToSet: { 
          ipAddresses: ipAddress,
          userAgents: userAgent 
        },
        lastLoginAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error updating user activity: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===== GESTIÓN DE TOKENS =====

  async updateTokens(id: string, tokens: any): Promise<GoogleUser> {
    try {
      this.logger.log(`Updating tokens for Google user: ${id}`);

      const updatedUser = await this.googleUserModel.findByIdAndUpdate(
        id,
        { 
          tokens,
          lastTokenRefresh: new Date(),
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new NotFoundException('Google user not found');
      }

      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating tokens: ${error.message}`, error.stack);
      throw error;
    }
  }

  async refreshAccessToken(id: string, newAccessToken: string): Promise<void> {
    try {
      await this.googleUserModel.findByIdAndUpdate(id, {
        'tokens.access_token': newAccessToken,
        lastTokenRefresh: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error refreshing access token: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===== GESTIÓN DE ESTADOS =====

  async suspendUser(id: string, reason?: string): Promise<GoogleUser> {
    try {
      this.logger.log(`Suspending Google user: ${id}`);

      const suspendedUser = await this.googleUserModel.findByIdAndUpdate(
        id,
        { 
          status: 'suspended',
          isActive: false,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!suspendedUser) {
        throw new NotFoundException('Google user not found');
      }

      this.logger.log(`Google user suspended successfully: ${id}`);
      return suspendedUser;
    } catch (error) {
      this.logger.error(`Error suspending Google user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async activateUser(id: string): Promise<GoogleUser> {
    try {
      this.logger.log(`Activating Google user: ${id}`);

      const activatedUser = await this.googleUserModel.findByIdAndUpdate(
        id,
        { 
          status: 'active',
          isActive: true,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!activatedUser) {
        throw new NotFoundException('Google user not found');
      }

      this.logger.log(`Google user activated successfully: ${id}`);
      return activatedUser;
    } catch (error) {
      this.logger.error(`Error activating Google user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      this.logger.log(`Soft deleting Google user: ${id}`);

      await this.googleUserModel.findByIdAndUpdate(id, {
        status: 'deleted',
        isActive: false,
        updatedAt: new Date(),
      });

      this.logger.log(`Google user soft deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting Google user: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===== CONSULTAS Y ESTADÍSTICAS =====

  async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: GoogleUser[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        this.googleUserModel
          .find({ status: { $ne: 'deleted' } })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.googleUserModel.countDocuments({ status: { $ne: 'deleted' } }),
      ]);

      return { users, total };
    } catch (error) {
      this.logger.error(`Error getting all users: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActiveUsers(): Promise<GoogleUser[]> {
    try {
      return await this.googleUserModel
        .find({ status: 'active', isActive: true })
        .sort({ lastLoginAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error getting active users: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserStats(): Promise<any> {
    try {
      const stats = await this.googleUserModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgLoginCount: { $avg: '$loginCount' },
          },
        },
      ]);

      const totalUsers = await this.googleUserModel.countDocuments();
      const activeUsers = await this.googleUserModel.countDocuments({ 
        status: 'active', 
        isActive: true 
      });

      return {
        totalUsers,
        activeUsers,
        suspendedUsers: stats.find(s => s._id === 'suspended')?.count || 0,
        averageLoginCount: stats.reduce((acc, s) => acc + (s.avgLoginCount || 0), 0) / stats.length,
      };
    } catch (error) {
      this.logger.error(`Error getting user stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===== VINCULACIÓN CON USUARIOS TRADICIONALES =====

  async linkToTraditionalUser(googleUserId: string, traditionalUserId: string): Promise<GoogleUser> {
    try {
      this.logger.log(`Linking Google user ${googleUserId} to traditional user ${traditionalUserId}`);

      const linkedUser = await this.googleUserModel.findByIdAndUpdate(
        googleUserId,
        { linkedUserId: traditionalUserId },
        { new: true }
      );

      if (!linkedUser) {
        throw new NotFoundException('Google user not found');
      }

      this.logger.log(`Google user linked successfully: ${googleUserId}`);
      return linkedUser;
    } catch (error) {
      this.logger.error(`Error linking Google user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async unlinkFromTraditionalUser(googleUserId: string): Promise<GoogleUser> {
    try {
      this.logger.log(`Unlinking Google user ${googleUserId} from traditional user`);

      const unlinkedUser = await this.googleUserModel.findByIdAndUpdate(
        googleUserId,
        { $unset: { linkedUserId: 1 } },
        { new: true }
      );

      if (!unlinkedUser) {
        throw new NotFoundException('Google user not found');
      }

      this.logger.log(`Google user unlinked successfully: ${googleUserId}`);
      return unlinkedUser;
    } catch (error) {
      this.logger.error(`Error unlinking Google user: ${error.message}`, error.stack);
      throw error;
    }
  }
}
