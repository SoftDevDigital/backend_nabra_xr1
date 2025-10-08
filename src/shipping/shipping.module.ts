import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Schemas
import { Shipment, ShipmentSchema } from './schemas/shipment.schema';
import { PendingShipment, PendingShipmentSchema } from './schemas/pending-shipment.schema';

// Services
import { DrEnvioService } from './drenvio.service';
import { DrEnvioRealService } from './drenvio-real.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { TrackingService } from './tracking.service';
import { ShipmentService } from './shipment.service';
import { ShipmentProcessorService } from './services/shipment-processor.service';
import { ShipmentProcessorTask } from './tasks/shipment-processor.task';

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
      { name: PendingShipment.name, schema: PendingShipmentSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => CartModule),
    forwardRef(() => OrdersModule),
  ],
  controllers: [ShippingController],
  providers: [
    DrEnvioService,
    DrEnvioRealService,
    ShippingCalculatorService,
    TrackingService,
    ShipmentService,
    ShipmentProcessorService,
    ShipmentProcessorTask,
  ],
  exports: [
    DrEnvioService,
    DrEnvioRealService,
    ShippingCalculatorService,
    TrackingService,
    ShipmentService,
    ShipmentProcessorService,
  ],
})
export class ShippingModule {}
