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
    const cart = await this.cartService.getCart(req.user.userId);
    let total = 0;
    
    if (cart.items && cart.items.length > 0) {
      total = cart.items.reduce((sum, item) => {
        const product = item.product as any;
        return sum + (product.price * item.quantity);
      }, 0);
    }

    return {
      total: parseFloat(total.toFixed(2)),
      currency: 'USD',
      itemCount: cart.items ? cart.items.length : 0,
    };
  }
}
