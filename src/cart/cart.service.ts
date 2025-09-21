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

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @Inject(forwardRef(() => ProductsService)) private productsService: ProductsService,
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
    // Validar que el producto existe
    const product = await this.productsService.findById(addToCartDto.productId);
    if (!product) {
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
    if (product.sizes && product.sizes.length > 0 && !addToCartDto.size) {
      throw new BadRequestException('Size is required for this product');
    }

    if (addToCartDto.size && product.sizes && !product.sizes.includes(addToCartDto.size)) {
      throw new BadRequestException(`Size ${addToCartDto.size} is not available for this product`);
    }

    const cart = await this.getCart(userId);
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === addToCartDto.productId &&
        item.size === addToCartDto.size,
    );

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

    return await cart.save();
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
    const product = await this.productsService.findById(item.product.toString());

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
        item.product.toString(), 
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

    return await cart.save();
  }

  async removeFromCart(userId: string, itemId: string) {
    const cart = await this.getCart(userId);
    const itemExists = cart.items.some((item) => item._id.toString() === itemId);
    
    if (!itemExists) {
      throw new NotFoundException('Item not found in cart');
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    return await cart.save();
  }

  async clearCart(userId: string) {
    const cart = await this.getCart(userId);
    cart.items = [];
    return await cart.save();
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

    const estimatedTax = parseFloat((subtotal * 0.1).toFixed(2)); // 10% tax estimate
    const estimatedTotal = parseFloat((subtotal + estimatedTax).toFixed(2));

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
}
