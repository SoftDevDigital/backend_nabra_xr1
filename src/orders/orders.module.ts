import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrderNumberService } from './services/order-number.service';
import { OrderNotificationService } from './services/order-notification.service';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { ShippingModule } from '../shipping/shipping.module';
import { HttpModule } from '@nestjs/axios';
import { CommonModule } from '../common/common.module';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema }
    ]),
    forwardRef(() => CartModule),
    ProductsModule,
    forwardRef(() => UsersModule),
    HttpModule,
    forwardRef(() => CommonModule),
    forwardRef(() => ShippingModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderNumberService, OrderNotificationService],
  exports: [OrdersService, OrderNumberService, OrderNotificationService],
})
export class OrdersModule {}
