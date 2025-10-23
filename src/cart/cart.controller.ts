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

  @ApiOperation({ 
    summary: 'Obtener carrito', 
    description: 'Obtiene el carrito del usuario con promociones aplicadas automáticamente en tiempo real. Los precios mostrados ya incluyen descuentos si hay promociones activas.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Carrito con promociones aplicadas automáticamente',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              product: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number', description: 'Precio final con promoción aplicada' },
                  originalPrice: { type: 'number', description: 'Precio original sin promoción' },
                  hasPromotion: { type: 'boolean' },
                  promotionName: { type: 'string' }
                }
              },
              quantity: { type: 'number' },
              size: { type: 'string' },
              originalPrice: { type: 'number', description: 'Precio original del item' },
              finalPrice: { type: 'number', description: 'Precio final con promoción' },
              hasPromotion: { type: 'boolean' },
              promotionName: { type: 'string' },
              discountAmount: { type: 'number', description: 'Descuento aplicado al item' }
            }
          }
        },
        subtotal: { type: 'number', description: 'Subtotal con promociones aplicadas' },
        estimatedTotal: { type: 'number', description: 'Total estimado con promociones' },
        finalTotal: { type: 'number', description: 'Total final con promociones aplicadas' },
        originalTotal: { type: 'number', description: 'Total original sin promociones' },
        totalDiscount: { type: 'number', description: 'Descuento total aplicado' },
        promotions: {
          type: 'object',
          properties: {
            appliedPromotions: { type: 'array' },
            totalDiscount: { type: 'number' }
          }
        },
        lastUpdated: { type: 'string', format: 'date-time' },
        promotionsChecked: { type: 'number', description: 'Número de productos con promociones' },
        stockValidation: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean' },
            errors: { type: 'array' },
            warnings: { type: 'array' }
          }
        }
      }
    }
  })
  @Get()
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.userId);
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
    return this.cartService.validateCartStock(req.user.userId);
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

  @ApiOperation({ 
    summary: 'Vista previa del checkout', 
    description: 'Obtiene el carrito con precios finales para checkout. Incluye promociones aplicadas y totales reales.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Carrito listo para checkout con precios finales',
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
                  quantity: { type: 'number' },
                  total: { type: 'number', description: 'Total del item (precio * cantidad)' }
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
        finalTotal: { type: 'number', description: 'Total final a pagar' },
        lastUpdated: { type: 'string', format: 'date-time' },
        promotionsChecked: { type: 'number', description: 'Número de productos con promociones' },
        checkoutReady: { type: 'boolean', description: 'Indica si el carrito está listo para checkout' }
      }
    }
  })
  @Get('checkout-preview')
  async getCheckoutPreview(@Request() req) {
    const cartWithPromotions = await this.cartService.getCartSummaryWithDiscounts(req.user.userId);
    
    return {
      ...cartWithPromotions,
      checkoutReady: true,
      message: 'Carrito listo para checkout con precios actualizados'
    };
  }

}
