import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = {
  useFactory: async (
    configService: ConfigService,
  ): Promise<MongooseModuleOptions> => ({
    uri: configService.get<string>('MONGO_URI'),
  }),
  inject: [ConfigService],
};
