import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

// Schemas
import { Promotion, PromotionSchema } from './schemas/promotion.schema';
import { Coupon, CouponSchema } from './schemas/coupon.schema';

// Services
import { PromotionsService } from './promotions.service';
import { DiscountCalculatorService } from './discount-calculator.service';

// Controllers
import { PromotionsController } from './promotions.controller';

// External modules
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: Coupon.name, schema: CouponSchema },
    ]),
    forwardRef(() => ProductsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService, DiscountCalculatorService],
  exports: [PromotionsService, DiscountCalculatorService],
})
export class PromotionsModule {}
