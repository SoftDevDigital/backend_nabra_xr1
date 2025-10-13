import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schemas/cart.schema';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';
import { Types } from 'mongoose';
import { ProductsService } from '../products/products.service';
import { DiscountCalculatorService } from '../promotions/discount-calculator.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @Inject(forwardRef(() => ProductsService)) private productsService: ProductsService,
    @Inject(forwardRef(() => DiscountCalculatorService)) private discountCalculatorService: DiscountCalculatorService,
  ) {}

  async getCart(userId: string) {
    let cart = await this.cartModel
      .findOne({ userId })
      .populate('items.product');
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }
    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    // Validar que el producto existe y obtener info con promociones
    const productWithPromotions = await this.productsService.findByIdWithPromotions(addToCartDto.productId);
    if (!productWithPromotions) {
      throw new NotFoundException('Product not found');
    }

    // Validar cantidad mínima
    if (addToCartDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // Validar cantidad máxima por item (límite de seguridad)
    if (addToCartDto.quantity > 99) {
      throw new BadRequestException('Maximum quantity per item is 99');
    }

    // Validar talla si el producto la requiere
    if (productWithPromotions.sizes && productWithPromotions.sizes.length > 0 && !addToCartDto.size) {
      throw new BadRequestException('Size is required for this product');
    }

    if (addToCartDto.size && productWithPromotions.sizes && !productWithPromotions.sizes.includes(addToCartDto.size)) {
      throw new BadRequestException(`Size ${addToCartDto.size} is not available for this product`);
    }

    const cart = await this.getCart(userId);
    const existingItem = cart.items.find((item) => {
      // Obtener el ID del producto correctamente
      let productId: string;
      if (typeof item.product === 'object' && item.product._id) {
        // Si está populado, usar el _id del objeto
        productId = item.product._id.toString();
      } else {
        // Si no está populado, usar directamente el ObjectId
        productId = item.product.toString();
      }
      
      return productId === addToCartDto.productId && item.size === addToCartDto.size;
    });

    const finalQuantity = existingItem 
      ? existingItem.quantity + addToCartDto.quantity
      : addToCartDto.quantity;

    // Validar stock disponible
    const stockCheck = await this.productsService.checkStockAvailability(
      addToCartDto.productId, 
      finalQuantity
    );

    if (!stockCheck.available) {
      throw new BadRequestException(stockCheck.message);
    }

    if (existingItem) {
      existingItem.quantity = finalQuantity;
    } else {
      cart.items.push({
        _id: new Types.ObjectId(),
        product: new Types.ObjectId(addToCartDto.productId),
        quantity: addToCartDto.quantity,
        size: addToCartDto.size,
      });
    }

    await cart.save();

    // ✅ RETORNAR CARRITO CON PROMOCIONES APLICADAS AUTOMÁTICAMENTE
    // Esto permite que el frontend muestre inmediatamente el precio con descuento
    const cartWithPromotions = await this.getCartSummaryWithDiscounts(userId);
    
    return {
      success: true,
      message: productWithPromotions.hasPromotion 
        ? `Producto agregado con promoción "${productWithPromotions.promotionName}" aplicada`
        : 'Producto agregado al carrito',
      cart: cartWithPromotions,
      productAddedInfo: {
        productId: addToCartDto.productId,
        productName: productWithPromotions.name,
        quantity: addToCartDto.quantity,
        originalPrice: productWithPromotions.originalPrice,
        finalPrice: productWithPromotions.finalPrice,
        hasPromotion: productWithPromotions.hasPromotion,
        promotionName: productWithPromotions.promotionName,
        discountAmount: productWithPromotions.discountAmount,
      }
    };
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    updateCartDto: UpdateCartDto,
  ) {
    const cart = await this.getCart(userId);
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId,
    );
    
    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    const item = cart.items[itemIndex];
    
    // Obtener el ID del producto correctamente
    let productId: string;
    if (typeof item.product === 'object' && item.product._id) {
      // Si está populado, usar el _id del objeto
      productId = item.product._id.toString();
    } else {
      // Si no está populado, usar directamente el ObjectId
      productId = item.product.toString();
    }
    
    const product = await this.productsService.findById(productId);

    // Validar nueva cantidad si se proporciona
    if (updateCartDto.quantity !== undefined) {
      if (updateCartDto.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      if (updateCartDto.quantity > 99) {
        throw new BadRequestException('Maximum quantity per item is 99');
      }

      // Validar stock para la nueva cantidad
      const stockCheck = await this.productsService.checkStockAvailability(
        productId, 
        updateCartDto.quantity
      );

      if (!stockCheck.available) {
        throw new BadRequestException(stockCheck.message);
      }

      cart.items[itemIndex].quantity = updateCartDto.quantity;
    }

    // Validar nueva talla si se proporciona
    if (updateCartDto.size !== undefined) {
      if (product.sizes && product.sizes.length > 0 && !updateCartDto.size) {
        throw new BadRequestException('Size is required for this product');
      }

      if (updateCartDto.size && product.sizes && !product.sizes.includes(updateCartDto.size)) {
        throw new BadRequestException(`Size ${updateCartDto.size} is not available for this product`);
      }

      cart.items[itemIndex].size = updateCartDto.size;
    }

    await cart.save();

    // ✅ RETORNAR CARRITO ACTUALIZADO CON PROMOCIONES
    return await this.getCartSummaryWithDiscounts(userId);
  }

  async removeFromCart(userId: string, itemId: string) {
    const cart = await this.getCart(userId);
    const itemExists = cart.items.some((item) => item._id.toString() === itemId);
    
    if (!itemExists) {
      throw new NotFoundException('Item not found in cart');
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    // ✅ RETORNAR CARRITO ACTUALIZADO CON PROMOCIONES
    return await this.getCartSummaryWithDiscounts(userId);
  }

  async clearCart(userId: string) {
    console.log('🧹 [CART-SERVICE] Limpiando carrito completamente para usuario:', userId);
    
    // Limpiar TODA la información del carrito
    await this.cartModel.updateOne(
      { userId }, 
      { 
        $set: { 
          items: []
        } 
      }
    ).exec();
    
    console.log('✅ [CART-SERVICE] Carrito limpiado completamente');
    return { success: true } as const;
  }


  async validateCartForCheckout(userId: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const cart = await this.getCart(userId);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!cart.items || cart.items.length === 0) {
      errors.push('Cart is empty');
      return { valid: false, errors, warnings };
    }

    // Validar cada item del carrito
    for (const item of cart.items) {
      try {
        // Extraer el ID del producto correctamente
        let productId: string;
        
        if (typeof item.product === 'string') {
          productId = item.product;
        } else if (item.product && typeof item.product === 'object') {
          // Si es un objeto poblado, extraer el _id
          productId = (item.product as any)._id?.toString() || (item.product as any).toString();
        } else {
          productId = (item.product as any).toString();
        }

        const product = await this.productsService.findById(productId);
        
        // Validar que el producto aún existe
        if (!product) {
          errors.push(`Product no longer exists`);
          continue;
        }

        // Validar stock actual
        const stockCheck = await this.productsService.checkStockAvailability(
          productId, 
          item.quantity
        );

        if (!stockCheck.available) {
          if (stockCheck.currentStock === 0) {
            errors.push(`${product.name} is out of stock`);
          } else {
            warnings.push(`${product.name}: Only ${stockCheck.currentStock} available (you have ${item.quantity} in cart)`);
          }
        }

        // Validar talla si es requerida
        if (product.sizes && product.sizes.length > 0) {
          if (!item.size) {
            errors.push(`Size is required for ${product.name}`);
          } else if (!product.sizes.includes(item.size)) {
            errors.push(`Size ${item.size} is no longer available for ${product.name}`);
          }
        }

      } catch (error) {
        errors.push(`Error validating product: ${error.message}`);
      }
    }

    return { 
      valid: errors.length === 0, 
      errors, 
      warnings 
    };
  }

  async getCartSummary(userId: string): Promise<{
    items: any[];
    totalItems: number;
    totalQuantity: number;
    subtotal: number;
    estimatedTax: number;
    estimatedTotal: number;
    currency: string;
  }> {
    const cart = await this.getCart(userId);
    
    let totalQuantity = 0;
    let subtotal = 0;
    
    const items = cart.items.map((item) => {
      const product = item.product as any;
      const itemTotal = product.price * item.quantity;
      totalQuantity += item.quantity;
      subtotal += itemTotal;
      
      return {
        _id: item._id,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          images: product.images,
          stock: product.stock,
          isPreorder: product.isPreorder,
        },
        quantity: item.quantity,
        size: item.size,
        itemTotal: parseFloat(itemTotal.toFixed(2)),
      };
    });

    const estimatedTax = 0; // Impuestos deshabilitados
    const estimatedTotal = parseFloat(subtotal.toFixed(2));

    return {
      items,
      totalItems: cart.items.length,
      totalQuantity,
      subtotal: parseFloat(subtotal.toFixed(2)),
      estimatedTax,
      estimatedTotal,
      currency: 'USD',
    };
  }

  async getCartSummaryWithDiscounts(userId: string, couponCode?: string): Promise<{
    cartSummary: any;
    discounts: any;
    finalTotal: number;
    lastUpdated: Date;
    promotionsChecked: number;
  }> {
    try {
      // Obtener resumen básico del carrito
      const cartSummary = await this.getCartSummary(userId);
      
      if (cartSummary.items.length === 0) {
        return {
          cartSummary,
          discounts: { appliedPromotions: [], totalDiscount: 0 },
          finalTotal: 0,
          lastUpdated: new Date(),
          promotionsChecked: 0,
        };
      }

      // Preparar items para el calculador de descuentos con información actualizada
      const cartItems = await Promise.all(
        cartSummary.items.map(async (item) => {
          try {
            // Obtener información actualizada del producto con promociones
            const productWithPromotions = await this.productsService.findByIdWithPromotions(item.product._id.toString());
            
            return {
              productId: item.product._id,
              cartItemId: item._id,
              productName: item.product.name,
              category: item.product.category || 'general',
              quantity: item.quantity,
              price: productWithPromotions.finalPrice, // Usar precio con promoción
              originalPrice: productWithPromotions.originalPrice,
              hasPromotion: productWithPromotions.hasPromotion,
              promotionName: productWithPromotions.promotionName,
              size: item.size,
            };
          } catch (error) {
            // Si falla, usar precio original
            return {
              productId: item.product._id,
              cartItemId: item._id,
              productName: item.product.name,
              category: item.product.category || 'general',
              quantity: item.quantity,
              price: item.product.price,
              originalPrice: item.product.price,
              hasPromotion: false,
              size: item.size,
            };
          }
        })
      );

      // Calcular totales con precios actualizados
      const updatedSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const updatedTax = 0; // Impuestos deshabilitados
      const updatedTotal = updatedSubtotal;

      // Calcular descuentos adicionales (cupones, promociones de carrito, etc.)
      const discounts = await this.discountCalculatorService.calculateDiscounts(userId, {
        couponCode,
        cartItems,
        totalAmount: updatedSubtotal,
      });

      const finalTotal = Math.max(0, updatedTotal - discounts.totalDiscount);

      // Contar promociones aplicadas
      const promotionsChecked = cartItems.filter(item => item.hasPromotion).length;

      return {
        cartSummary: {
          ...cartSummary,
          subtotal: Math.round(updatedSubtotal * 100) / 100,
          estimatedTax: Math.round(updatedTax * 100) / 100,
          estimatedTotal: Math.round(updatedTotal * 100) / 100,
          originalTotal: cartSummary.estimatedTotal,
          items: cartItems, // Incluir items con información de promociones
        },
        discounts,
        finalTotal: Math.round(finalTotal * 100) / 100,
        lastUpdated: new Date(),
        promotionsChecked,
      };

    } catch (error) {
      // Si falla el cálculo de descuentos, retornar carrito sin descuentos
      const cartSummary = await this.getCartSummary(userId);
      return {
        cartSummary,
        discounts: { 
          success: false, 
          appliedPromotions: [], 
          totalDiscount: 0,
          errors: [error.message] 
        },
        finalTotal: cartSummary.estimatedTotal,
        lastUpdated: new Date(),
        promotionsChecked: 0,
      };
    }
  }

}
