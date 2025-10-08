import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

// Schemas simplificados
import { SimplePromotion, SimplePromotionSchema } from './schemas/simple-promotion.schema';
import { SimpleCoupon, SimpleCouponSchema } from './schemas/simple-coupon.schema';

// Servicios y controladores
import { SimplePromotionsService } from './simple-promotions.service';
import { SimplePromotionsController } from './simple-promotions.controller';

// Módulos externos
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: SimplePromotion.name, schema: SimplePromotionSchema },
      { name: SimpleCoupon.name, schema: SimpleCouponSchema },
    ]),
    forwardRef(() => ProductsModule),
  ],
  controllers: [SimplePromotionsController],
  providers: [SimplePromotionsService],
  exports: [SimplePromotionsService],
})
export class SimplePromotionsModule {}
