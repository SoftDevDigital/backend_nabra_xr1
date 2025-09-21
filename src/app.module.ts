import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from './common/common.module';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { MediaModule } from './media/media.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ShippingModule } from './shipping/shipping.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminSimpleModule } from './admin/admin-simple.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync(databaseConfig),
    CommonModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    MediaModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    ReviewsModule,
    AdminSimpleModule,
  ],
})
export class AppModule {}
