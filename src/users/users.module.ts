import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { ProfileController } from './profile.controller';
import { AddressController } from './controllers/address.controller';
import { UsersService } from './users.service';
import { ProfileService } from './profile.service';
import { AddressService } from './services/address.service';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';
import { Address, AddressSchema } from './schemas/address.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  controllers: [UsersController, ProfileController, AddressController],
  providers: [UsersService, ProfileService, AddressService],
  exports: [UsersService, ProfileService, AddressService],
})
export class UsersModule {}
