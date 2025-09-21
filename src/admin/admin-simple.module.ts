import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSimpleController } from './admin-simple.controller';

// Schemas
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';
import { Promotion, PromotionSchema } from '../promotions/schemas/promotion.schema';
import { Coupon, CouponSchema } from '../promotions/schemas/coupon.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Promotion.name, schema: PromotionSchema },
      { name: Coupon.name, schema: CouponSchema },
    ]),
  ],
  controllers: [AdminSimpleController],
  providers: [],
  exports: [],
})
export class AdminSimpleModule {}
