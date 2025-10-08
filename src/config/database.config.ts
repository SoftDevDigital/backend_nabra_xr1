import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = {
  useFactory: async (
    configService: ConfigService,
  ): Promise<MongooseModuleOptions> => {
    const uri =
      (await configService.get<string>('MONGO_URI')) ||
      (await configService.get<string>('MONGODB_URI'));
    return {
      uri,
      // Opciones para escalabilidad
      maxPoolSize: 10, // Máximo de conexiones simultáneas
      autoIndex: true, // Crea índices automáticamente en desarrollo
    };
  },
  inject: [ConfigService],
};
