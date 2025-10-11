import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from './schemas/order.schema';
import { CheckoutPartialDto } from './dtos/checkout-partial';
import { UpdateStatusDto } from './dtos/update-status';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { Cart } from '../cart/schemas/cart.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private cartService: CartService,
    private productsService: ProductsService,
  ) {}

  async createOrderFromPartial(userId: string, checkoutPartialDto: CheckoutPartialDto) {
    try {
      const cart: Cart = await this.cartService.getCart(userId);
      if (!cart) {
        throw new NotFoundException('No se encontró un carrito para el usuario con ID ' + userId);
      }
      if (cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío, no se pueden procesar pedidos sin productos');
      }
      
      if (!Types.ObjectId.isValid(checkoutPartialDto.cartId)) {
        throw new BadRequestException('El ID del carrito proporcionado no es un ID válido de MongoDB');
      }
      
      const cartId = new Types.ObjectId(checkoutPartialDto.cartId);
      if (!cart._id || cart._id.toString() !== cartId.toString()) {
        throw new BadRequestException(
          `El ID del carrito proporcionado (${checkoutPartialDto.cartId}) no coincide con el carrito del usuario (${cart._id?.toString() || 'desconocido'})`,
        );
      }

      const orderItems: {
        product: Types.ObjectId;
        quantity: number;
        size: string | undefined;
        price: number;
      }[] = [];
      let total = 0;

      for (const partialItem of checkoutPartialDto.items) {
        const cartItem = cart.items.find((item) => item._id.toString() === partialItem.itemId);
        if (!cartItem) {
          throw new BadRequestException(`El producto con ID ${partialItem.itemId} no se encuentra en el carrito`);
        }
        if (partialItem.quantity > cartItem.quantity) {
          throw new BadRequestException(
            `La cantidad solicitada (${partialItem.quantity}) para el producto con ID ${partialItem.itemId} excede la cantidad disponible (${cartItem.quantity})`,
          );
        }
        
        // Extraer el ObjectId del producto poblado
        const productId = cartItem.product._id || cartItem.product;
        const price = await this.getProductPrice(productId as Types.ObjectId);
        
        const itemTotal = partialItem.quantity * price;
        total += itemTotal;
        orderItems.push({
          product: productId as Types.ObjectId, // Usar solo el ObjectId
          quantity: partialItem.quantity,
          size: cartItem.size,
          price,
        });
        
        cartItem.quantity -= partialItem.quantity;
        if (cartItem.quantity <= 0) {
          cart.items = cart.items.filter((item) => item._id.toString() !== partialItem.itemId);
        }
      }

      const order = new this.orderModel({
        items: orderItems,
        userId,
        cartId: checkoutPartialDto.cartId,
        total,
        shippingAddress: checkoutPartialDto.shippingAddress,
      });
      await order.save();
      await cart.save();
      return order;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error detallado:', error); // Para depuración
      throw new InternalServerErrorException(
        `Error al procesar el pedido: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  async getOrderById(id: string, userId: string) {
    const order = await this.orderModel
      .findOne({ _id: id, userId })
      .populate('items.product');
    if (!order) {
      throw new NotFoundException(`No se encontró un pedido con ID ${id} para el usuario con ID ${userId}`);
    }
    return order;
  }

  async getOrders(user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Se requiere rol de administrador para consultar todos los pedidos');
    }
    return this.orderModel.find().populate('items.product');
  }

  async updateStatus(id: string, updateStatusDto: UpdateStatusDto, user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Se requiere rol de administrador para actualizar el estado de un pedido');
    }
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { $set: { status: updateStatusDto.status } },
      { new: true, runValidators: true },
    );
    if (!order) {
      throw new NotFoundException(`No se encontró un pedido con ID ${id}`);
    }
    return order;
  }

  async createOrderFromPayment(paymentData: {
    userId: string;
    paymentId: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      productId?: string;
    }>;
    totalAmount: number;
    currency: string;
    shippingAddress?: any;
    shippingContact?: any;
    shippingOption?: any;
  }) {
    try {
      const orderItems: Array<{
        product: Types.ObjectId | null;
        quantity: number;
        price: number;
        size?: string;
        productName?: string;
      }> = [];
      
      for (const item of paymentData.items) {
        // Si tenemos productId, usarlo; si no, intentar encontrar el producto por nombre
        let productId = item.productId;
        
        if (!productId && item.name) {
          // Buscar producto por nombre (esto es un fallback)
          const products = await this.productsService.findAll({ limit: 1 });
          const foundProduct = products.find(p => p.name === item.name);
          productId = foundProduct?._id?.toString();
        }

        orderItems.push({
          product: productId ? new Types.ObjectId(productId) : null,
          quantity: item.quantity,
          price: item.price,
          size: undefined, // No tenemos info de talla desde el pago
          productName: item.name, // Guardamos el nombre por si no encontramos el producto
        });
      }

      const order = new this.orderModel({
        items: orderItems,
        userId: new Types.ObjectId(paymentData.userId),
        total: paymentData.totalAmount,
        currency: paymentData.currency,
        status: 'paid', // Ya está pagado
        paymentId: paymentData.paymentId,
        shippingAddress: paymentData.shippingAddress || {
          street: 'Pending',
          city: 'Pending', 
          zip: 'Pending',
          country: 'Pending'
        },
        createdAt: new Date(),
      });

      await order.save();
      this.logger.log(`Order created from payment: ${order._id} for user ${paymentData.userId}`);
      
      return order;
    } catch (error) {
      this.logger.error('Error creating order from payment:', error);
      throw new InternalServerErrorException(`Failed to create order: ${error.message}`);
    }
  }

  async getUserOrders(userId: string, limit: number = 10, offset: number = 0) {
    try {
      const orders = await this.orderModel
        .find({ userId })
        .populate('items.product')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      return orders;
    } catch (error) {
      this.logger.error('Error fetching user orders:', error);
      throw new InternalServerErrorException('Failed to fetch orders');
    }
  }

  async getUserOrderById(userId: string, orderId: string) {
    try {
      const order = await this.orderModel
        .findOne({ _id: orderId, userId })
        .populate('items.product')
        .exec();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching user order:', error);
      throw new InternalServerErrorException('Failed to fetch order');
    }
  }

  async getOrderSummary(userId: string) {
    try {
      const totalOrders = await this.orderModel.countDocuments({ userId });
      const paidOrders = await this.orderModel.countDocuments({ userId, status: 'paid' });
      const pendingOrders = await this.orderModel.countDocuments({ userId, status: 'pending' });
      
      const totalSpentResult = await this.orderModel.aggregate([
        { $match: { userId: new Types.ObjectId(userId), status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);

      const totalSpent = totalSpentResult[0]?.total || 0;

      return {
        totalOrders,
        paidOrders,
        pendingOrders,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        currency: 'USD'
      };
    } catch (error) {
      this.logger.error('Error getting order summary:', error);
      throw new InternalServerErrorException('Failed to get order summary');
    }
  }

  private async getProductPrice(productId: Types.ObjectId) {
    const product = await this.productsService.findById(productId.toString());
    if (!product) {
      throw new NotFoundException(`No se encontró un producto con ID ${productId}`);
    }
    return product.price;
  }
}