import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  Query,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from '../payments/payments.service';

@Controller('cart')
export class CartController {
  constructor(
    private cartService: CartService,
    @Inject(forwardRef(() => PaymentsService)) private paymentsService: PaymentsService,
  ) {}

  @Get()
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('add')
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(req.user.userId, addToCartDto);
  }

  @Put('update/:itemId')
  async updateCartItem(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    return this.cartService.updateCartItem(
      req.user.userId,
      itemId,
      updateCartDto,
    );
  }

  @Delete('remove/:itemId')
  async removeFromCart(@Request() req, @Param('itemId') itemId: string) {
    return this.cartService.removeFromCart(req.user.userId, itemId);
  }

  @Post('checkout')
  async checkoutCart(
    @Request() req,
    @Query('returnUrl') returnUrl?: string,
    @Query('cancelUrl') cancelUrl?: string,
  ) {
    return this.paymentsService.createPaymentFromCart(
      req.user.userId,
      returnUrl,
      cancelUrl,
    );
  }

  @Get('total')
  async getCartTotal(@Request() req) {
    return this.cartService.getCartSummary(req.user.userId);
  }

  @Get('validate')
  async validateCart(@Request() req) {
    return this.cartService.validateCartForCheckout(req.user.userId);
  }

  @Delete('clear')
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.userId);
  }

  @Get('summary')
  async getCartSummary(@Request() req) {
    return this.cartService.getCartSummary(req.user.userId);
  }

  @Get('summary-with-discounts')
  async getCartSummaryWithDiscounts(
    @Request() req,
    @Query('couponCode') couponCode?: string,
  ) {
    return this.cartService.getCartSummaryWithDiscounts(req.user.userId, couponCode);
  }

  @Post('apply-coupon')
  async applyCoupon(
    @Request() req,
    @Body() body: { couponCode: string },
  ) {
    return this.cartService.getCartSummaryWithDiscounts(req.user.userId, body.couponCode);
  }
}
