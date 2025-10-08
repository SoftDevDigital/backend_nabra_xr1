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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Cart')
@ApiBearerAuth('bearer')
@Controller('cart')
export class CartController {
  constructor(
    private cartService: CartService,
    @Inject(forwardRef(() => PaymentsService)) private paymentsService: PaymentsService,
  ) {}

  @ApiOperation({ summary: 'Obtener carrito', description: 'Obtiene el carrito del usuario autenticado con items, totales y promociones aplicadas automáticamente.' })
  @ApiResponse({ 
    status: 200, 
    description: 'Carrito con promociones aplicadas',
    schema: {
      type: 'object',
      properties: {
        cartSummary: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  productName: { type: 'string' },
                  price: { type: 'number', description: 'Precio final con promoción' },
                  originalPrice: { type: 'number', description: 'Precio original sin promoción' },
                  hasPromotion: { type: 'boolean' },
                  promotionName: { type: 'string' },
                  quantity: { type: 'number' }
                }
              }
            },
            subtotal: { type: 'number' },
            estimatedTotal: { type: 'number' },
            originalTotal: { type: 'number', description: 'Total sin promociones' }
          }
        },
        discounts: {
          type: 'object',
          properties: {
            appliedPromotions: { type: 'array' },
            totalDiscount: { type: 'number' }
          }
        },
        finalTotal: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
        promotionsChecked: { type: 'number', description: 'Número de productos con promociones' }
      }
    }
  })
  @Get()
  async getCart(@Request() req) {
    return this.cartService.getCartSummaryWithDiscounts(req.user.userId);
  }

  @ApiOperation({ summary: 'Agregar al carrito', description: 'Agrega un producto al carrito del usuario.' })
  @ApiBody({ type: AddToCartDto })
  @Post('add')
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(req.user.userId, addToCartDto);
  }

  @ApiOperation({ summary: 'Actualizar item del carrito', description: 'Actualiza cantidad o atributos de un item del carrito.' })
  @ApiParam({ name: 'itemId', description: 'ID del item en el carrito' })
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

  @ApiOperation({ summary: 'Eliminar item del carrito', description: 'Elimina un item del carrito del usuario.' })
  @ApiParam({ name: 'itemId', description: 'ID del item en el carrito' })
  @Delete('remove/:itemId')
  async removeFromCart(@Request() req, @Param('itemId') itemId: string) {
    return this.cartService.removeFromCart(req.user.userId, itemId);
  }


  @ApiOperation({ summary: 'Total del carrito', description: 'Devuelve totales, impuestos y descuentos del carrito.' })
  @Get('total')
  async getCartTotal(@Request() req) {
    return this.cartService.getCartSummary(req.user.userId);
  }

  @ApiOperation({ summary: 'Validar carrito', description: 'Valida stock, disponibilidad y reglas de negocio para checkout.' })
  @Get('validate')
  async validateCart(@Request() req) {
    return this.cartService.validateCartForCheckout(req.user.userId);
  }

  @ApiOperation({ summary: 'Vaciar carrito', description: 'Elimina todos los items del carrito.' })
  @Delete('clear')
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.userId);
  }


  @ApiOperation({ summary: 'Resumen del carrito', description: 'Resumen con totales y breakdown de precios.' })
  @Get('summary')
  async getCartSummary(@Request() req) {
    return this.cartService.getCartSummary(req.user.userId);
  }

  @ApiOperation({ summary: 'Resumen con descuentos', description: 'Resumen del carrito aplicando un cupón opcional.' })
  @ApiQuery({ name: 'couponCode', required: false })
  @Get('summary-with-discounts')
  async getCartSummaryWithDiscounts(
    @Request() req,
    @Query('couponCode') couponCode?: string,
  ) {
    return this.cartService.getCartSummaryWithDiscounts(req.user.userId, couponCode);
  }

  @ApiOperation({ summary: 'Aplicar cupón', description: 'Aplica un cupón al carrito.' })
  @ApiBody({ schema: { type: 'object', properties: { couponCode: { type: 'string', example: 'BIENVENIDA10' } }, required: ['couponCode'], example: { couponCode: 'BIENVENIDA10' } } })
  @Post('apply-coupon')
  async applyCoupon(
    @Request() req,
    @Body() body: { couponCode: string },
  ) {
    return this.cartService.getCartSummaryWithDiscounts(req.user.userId, body.couponCode);
  }

  @ApiOperation({ 
    summary: 'Carrito con promociones actualizadas', 
    description: 'Obtiene el carrito verificando promociones en tiempo real. Recomendado para mostrar al usuario.' 
  })
  @ApiQuery({ name: 'couponCode', required: false, description: 'Código de cupón opcional' })
  @ApiResponse({ 
    status: 200, 
    description: 'Carrito con promociones verificadas',
    schema: {
      type: 'object',
      properties: {
        cartSummary: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  productName: { type: 'string' },
                  price: { type: 'number', description: 'Precio final con promoción' },
                  originalPrice: { type: 'number', description: 'Precio original sin promoción' },
                  hasPromotion: { type: 'boolean' },
                  promotionName: { type: 'string' },
                  quantity: { type: 'number' }
                }
              }
            },
            subtotal: { type: 'number' },
            estimatedTotal: { type: 'number' },
            originalTotal: { type: 'number', description: 'Total sin promociones' }
          }
        },
        discounts: {
          type: 'object',
          properties: {
            appliedPromotions: { type: 'array' },
            totalDiscount: { type: 'number' }
          }
        },
        finalTotal: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
        promotionsChecked: { type: 'number', description: 'Número de productos con promociones' }
      }
    }
  })
  @Get('with-promotions')
  async getCartWithPromotions(
    @Request() req,
    @Query('couponCode') couponCode?: string,
  ) {
    return this.cartService.getCartSummaryWithDiscounts(req.user.userId, couponCode);
  }

}
