import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Schemas
import { Shipment, ShipmentSchema } from './schemas/shipment.schema';

// Services
import { DrEnvioService } from './drenvio.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { TrackingService } from './tracking.service';
import { ShipmentService } from './shipment.service';

// Controllers
import { ShippingController } from './shipping.controller';

// Modules
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Shipment.name, schema: ShipmentSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => CartModule),
    forwardRef(() => OrdersModule),
  ],
  controllers: [ShippingController],
  providers: [
    DrEnvioService,
    ShippingCalculatorService,
    TrackingService,
    ShipmentService,
  ],
  exports: [
    DrEnvioService,
    ShippingCalculatorService,
    TrackingService,
    ShipmentService,
  ],
})
export class ShippingModule {}
