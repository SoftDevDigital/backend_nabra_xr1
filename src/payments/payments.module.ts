import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PayPalCallbackController } from './paypal-callback.controller';
import { PaymentsService } from './payments.service';
import { PayPalService } from './paypal.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    forwardRef(() => CartModule),
    ProductsModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [PaymentsController, PayPalCallbackController],
  providers: [PaymentsService, PayPalService],
  exports: [PaymentsService, PayPalService],
})
export class PaymentsModule {}
