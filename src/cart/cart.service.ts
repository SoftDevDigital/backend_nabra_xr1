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

  // Método interno para obtener carrito sin validación (uso interno)
  private async getCartInternal(userId: string): Promise<Cart> {
    let cart = await this.cartModel
      .findOne({ userId })
      .populate('items.product');
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }
    return cart;
  }

  // Método para uso interno de otros servicios (retorna Cart original)
  async getCartForInternalUse(userId: string): Promise<Cart> {
    return this.getCartInternal(userId);
  }

  // Método público - SIEMPRE incluye validación automática Y promociones en tiempo real
  async getCart(userId: string) {
    const cart = await this.getCartInternal(userId);

    // Validación automática de stock - SIEMPRE incluida
    const validation = await this.validateCartStock(userId);
    
    // Obtener carrito con promociones actualizadas en tiempo real
    const cartWithPromotions = await this.getCartSummaryWithDiscounts(userId);
    
    // Actualizar los items del carrito con precios reales (con promociones)
    const updatedItems = cart.items.map((cartItem) => {
      const productWithPromotion = cartWithPromotions.cartSummary.items.find(
        item => item.productId.toString() === cartItem.product._id.toString()
      );
      
      // Obtener el producto poblado o usar el ObjectId
      const product = cartItem.product as any;
      
      if (productWithPromotion) {
        return {
          _id: cartItem._id,
          quantity: cartItem.quantity,
          size: cartItem.size,
          // Agregar información de promoción al item del carrito
          originalPrice: productWithPromotion.originalPrice,
          finalPrice: productWithPromotion.price,
          hasPromotion: productWithPromotion.hasPromotion,
          promotionName: productWithPromotion.promotionName,
          discountAmount: productWithPromotion.originalPrice - productWithPromotion.price,
          // Actualizar el precio del producto para reflejar la promoción
          product: {
            _id: product._id,
            name: product.name,
            description: product.description,
            price: productWithPromotion.price, // Precio con promoción
            originalPrice: productWithPromotion.originalPrice,
            hasPromotion: productWithPromotion.hasPromotion,
            promotionName: productWithPromotion.promotionName,
            category: product.category,
            sizes: product.sizes,
            images: product.images,
            stockBySize: product.stockBySize,
            isPreorder: product.isPreorder,
            isFeatured: product.isFeatured,
            reviewStats: product.reviewStats
          }
        };
      }
      
      // Si no hay promoción, mantener precio original
      return {
        _id: cartItem._id,
        quantity: cartItem.quantity,
        size: cartItem.size,
        originalPrice: product.price,
        finalPrice: product.price,
        hasPromotion: false,
        product: {
          _id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.price,
          hasPromotion: false,
          category: product.category,
          sizes: product.sizes,
          images: product.images,
          stockBySize: product.stockBySize,
          isPreorder: product.isPreorder,
          isFeatured: product.isFeatured,
          reviewStats: product.reviewStats
        }
      };
    });
    
    // Retornar carrito con validación Y promociones incluidas automáticamente
    return {
      ...cart.toObject(),
      items: updatedItems, // Items con precios actualizados
      stockValidation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      },
      // Información de promociones aplicadas
      promotions: cartWithPromotions.discounts,
      finalTotal: cartWithPromotions.finalTotal,
      originalTotal: cartWithPromotions.cartSummary.originalTotal || cartWithPromotions.cartSummary.subtotal,
      totalDiscount: cartWithPromotions.discounts.totalDiscount,
      lastUpdated: cartWithPromotions.lastUpdated,
      promotionsChecked: cartWithPromotions.promotionsChecked,
      // Totales calculados
      subtotal: cartWithPromotions.cartSummary.subtotal,
      estimatedTotal: cartWithPromotions.cartSummary.estimatedTotal
    };
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

    // Validar talla si el producto la requiere Y tiene stockBySize configurado
    if (productWithPromotions.sizes && productWithPromotions.sizes.length > 0 && productWithPromotions.stockBySize && Object.keys(productWithPromotions.stockBySize).length > 0) {
      if (!addToCartDto.size) {
        throw new BadRequestException('Size is required for this product');
      }
      
      if (!productWithPromotions.sizes.includes(addToCartDto.size)) {
        throw new BadRequestException(`Size ${addToCartDto.size} is not available for this product`);
      }
    }

    const cart = await this.getCartInternal(userId);
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

    // Validar stock disponible POR TALLE
    const stockCheck = await this.productsService.checkStockAvailability(
      addToCartDto.productId, 
      finalQuantity,
      addToCartDto.size // Pasar el talle específico
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
    const cart = await this.getCartInternal(userId);
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
    const cart = await this.getCartInternal(userId);
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



  async getCartSummary(userId: string): Promise<{
    items: any[];
    totalItems: number;
    totalQuantity: number;
    subtotal: number;
    estimatedTax: number;
    estimatedTotal: number;
    currency: string;
  }> {
    const cart = await this.getCartInternal(userId);
    
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

  // ===== VALIDACIONES CRÍTICAS DE STOCK =====

  async validateCartStock(userId: string): Promise<{
    isValid: boolean;
    errors: Array<{
      productId: string;
      productName: string;
      size: string;
      requestedQuantity: number;
      availableStock: number;
      message: string;
    }>;
    warnings: Array<{
      productId: string;
      productName: string;
      size: string;
      message: string;
    }>;
  }> {
    const cart = await this.getCartInternal(userId);
    if (!cart || cart.items.length === 0) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: Array<{
      productId: string;
      productName: string;
      size: string;
      requestedQuantity: number;
      availableStock: number;
      message: string;
    }> = [];
    const warnings: Array<{
      productId: string;
      productName: string;
      size: string;
      message: string;
    }> = [];

    for (const item of cart.items) {
      try {
        // Obtener información del producto
        let productId: string;
        if (typeof item.product === 'object' && item.product._id) {
          productId = item.product._id.toString();
        } else {
          productId = item.product.toString();
        }

        const product = await this.productsService.findById(productId);
        if (!product) {
          errors.push({
            productId,
            productName: 'Producto no encontrado',
            size: item.size || 'N/A',
            requestedQuantity: item.quantity,
            availableStock: 0,
            message: 'El producto ya no existe'
          });
          continue;
        }

        // Validar stock por talle
        const stockCheck = await this.productsService.checkStockAvailability(
          productId,
          item.quantity,
          item.size
        );

        if (!stockCheck.available) {
          errors.push({
            productId,
            productName: product.name,
            size: item.size || 'N/A',
            requestedQuantity: item.quantity,
            availableStock: stockCheck.currentStock,
            message: stockCheck.message || 'Stock validation failed'
          });
        } else if (stockCheck.currentStock <= 2) {
          // Advertencia si queda poco stock
          warnings.push({
            productId,
            productName: product.name,
            size: item.size || 'N/A',
            message: `Quedan solo ${stockCheck.currentStock} unidades disponibles`
          });
        }

        // Validar si el producto sigue activo/disponible
        if (product.isPreorder) {
          warnings.push({
            productId,
            productName: product.name,
            size: item.size || 'N/A',
            message: 'Este producto está en preventa'
          });
        }

      } catch (error) {
        errors.push({
          productId: 'unknown',
          productName: 'Error de validación',
          size: item.size || 'N/A',
          requestedQuantity: item.quantity,
          availableStock: 0,
          message: `Error al validar producto: ${error.message}`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateCartBeforeCheckout(userId: string): Promise<void> {
    const validation = await this.validateCartStock(userId);
    
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(error => 
        `${error.productName} (Talle ${error.size}): ${error.message}`
      ).join('; ');
      
      throw new BadRequestException(
        `No se puede proceder al checkout. Problemas de stock: ${errorMessages}`
      );
    }
  }


}
