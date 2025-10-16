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
import { CheckoutRequestDto } from './dtos/checkout-address.dto';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { AddressService } from '../users/services/address.service';
import { Cart } from '../cart/schemas/cart.schema';
import { OrderNumberService } from './services/order-number.service';
import { OrderNotificationService } from './services/order-notification.service';
import { DrEnvioService } from '../shipping/drenvio.service';
import { CreateShipmentDto } from '../shipping/dtos/shipping-data.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private cartService: CartService,
    private productsService: ProductsService,
    private addressService: AddressService,
    private orderNumberService: OrderNumberService,
    private orderNotificationService: OrderNotificationService,
    private drenvioService: DrEnvioService,
  ) {}

  async createOrderFromPartial(userId: string, checkoutPartialDto: CheckoutPartialDto) {
    try {
      const cart: Cart = await this.cartService.getCartForInternalUse(userId);
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

      // Calcular subtotal y total final (sin envío)
      const subtotal = total;
      const tax = 0; // Impuestos deshabilitados
      const finalTotal = subtotal;

      // Crear la orden simplificada
      const order = new this.orderModel({
        items: orderItems,
        userId,
        cartId: checkoutPartialDto.cartId,
        subtotal,
        shippingCost: 0, // Sin envío por ahora
        tax,
        total: finalTotal,
        shippingAddress: checkoutPartialDto.shippingAddress,
      });

      await order.save();
      await cart.save();

      return order;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error detallado:', error); // Para depuración
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
      size?: string;
    }>;
    totalAmount: number;
    currency: string;
    customerEmail?: string;
    customerName?: string;
    shippingData?: any;
    simpleShipping?: {
      contact: {
        emailOrPhone?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
      address: {
        country: string;
        state: string;
        city: string;
        postalCode: string;
        addressLine: string;
        addressLine2?: string;
        neighborhood?: string;
        references?: string;
      };
    } | null;
    shippingOption?: {
      ObjectId?: string;
      ShippingId?: string;
      carrier?: string;
      service?: string;
      currency?: string;
      price?: number;
      insurance?: number;
      service_id?: string;
      days?: string;
    } | null;
    shippingCost?: number;
  }) {
    try {
      // Generar número de orden único
      const orderNumber = await this.orderNumberService.generateOrderNumber();
      
      const orderItems: Array<{
        product: Types.ObjectId | null;
        quantity: number;
        price: number;
        size?: string;
        productName?: string;
        productSnapshot?: {
          name: string;
          description: string;
          price: number;
          images: string[];
          category: string;
          brand: string;
          sku: string;
        };
        reservedStock: number;
        stockReleased: boolean;
      }> = [];
      
      let subtotal = 0;
      
      for (const item of paymentData.items) {
        // Si tenemos productId, usarlo; si no, intentar encontrar el producto por nombre
        let productId = item.productId;
        let productSnapshot: {
          name: string;
          description: string;
          price: number;
          images: string[];
          category: string;
          brand: string;
          sku: string;
        } | undefined = undefined;
        
        if (productId) {
          try {
            const product = await this.productsService.findById(productId);
            if (product) {
              productSnapshot = {
                name: product.name,
                description: product.description || '',
                price: product.price,
                images: product.images || [],
                category: product.category || '',
                brand: '', // No disponible en el esquema actual
                sku: '', // No disponible en el esquema actual
              };
            }
          } catch (error) {
            this.logger.warn(`Product ${productId} not found, using fallback data`);
          }
        }
        
        if (!productId && item.name) {
          // Buscar producto por nombre (esto es un fallback)
          const productsResponse = await this.productsService.findAll({ limit: 100 });
          const foundProduct = productsResponse.products.find(p => p.name === item.name);
          if (foundProduct) {
            productId = foundProduct._id?.toString();
            productSnapshot = {
              name: foundProduct.name,
              description: foundProduct.description || '',
              price: foundProduct.price,
              images: foundProduct.images || [],
              category: foundProduct.category || '',
              brand: '', // No disponible en el esquema actual
              sku: '', // No disponible en el esquema actual
            };
          }
        }

        const itemTotal = item.quantity * item.price;
        subtotal += itemTotal;

        orderItems.push({
          product: productId ? new Types.ObjectId(productId) : null,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          productName: item.name,
          productSnapshot: productSnapshot,
          reservedStock: item.quantity, // Reservar stock
          reservedStockSize: item.size, // Talle del stock reservado
          stockReleased: false, // Stock no liberado inicialmente
        } as any);
      }

      // Impuestos deshabilitados: establecemos tax = 0
      const tax = 0;
      const discount = 0; // Por ahora sin descuentos
      const shippingCost = paymentData.shippingCost || 0; // Usar costo de envío del pago
      const total = subtotal - discount + shippingCost;

      const order = new this.orderModel({
        orderNumber,
        items: orderItems,
        userId: new Types.ObjectId(paymentData.userId),
        subtotal,
        tax,
        discount,
        shippingCost,
        total,
        currency: paymentData.currency,
        status: 'paid', // Ya está pagado
        paymentId: paymentData.paymentId,
        paymentMethod: 'mercadopago',
        paymentStatus: 'approved',
        paymentDate: new Date(),
        customerEmail: paymentData.customerEmail,
        customerName: paymentData.customerName,
        source: 'web',
        shippingAddress: paymentData.shippingData ? {
          street: paymentData.shippingData.destination.street,
          city: paymentData.shippingData.destination.city,
          zip: paymentData.shippingData.destination.postal_code,
          country: paymentData.shippingData.destination.country,
          state: paymentData.shippingData.destination.state,
          postal_code: paymentData.shippingData.destination.postal_code,
          contact: {
            name: paymentData.shippingData.destination.name,
            phone: paymentData.shippingData.destination.phone,
            email: paymentData.shippingData.destination.email,
          }
        } : paymentData.simpleShipping ? {
          street: paymentData.simpleShipping.address.addressLine,
          city: paymentData.simpleShipping.address.city,
          zip: paymentData.simpleShipping.address.postalCode,
          country: paymentData.simpleShipping.address.country,
          state: paymentData.simpleShipping.address.state,
          contact: {
            name: `${paymentData.simpleShipping.contact.firstName || ''} ${paymentData.simpleShipping.contact.lastName || ''}`.trim(),
            phone: paymentData.simpleShipping.contact.phone || paymentData.simpleShipping.contact.emailOrPhone || '',
            email: paymentData.simpleShipping.contact.emailOrPhone?.includes('@') ? paymentData.simpleShipping.contact.emailOrPhone : undefined,
          }
        } : {
          street: 'Pending',
          city: 'Pending', 
          zip: 'Pending',
          country: 'Pending'
        }, // Dirección de envío o pendiente
        shippingInfo: paymentData.shippingData ? {
          carrier: paymentData.shippingData.shipment.carrier,
          service: paymentData.shippingData.shipment.service,
          serviceId: paymentData.shippingData.service_id,
          packages: paymentData.shippingData.packages,
          insurance: paymentData.shippingData.insurance,
          // Información de contacto de DrEnvío
          contact: paymentData.shippingData.destination ? {
            name: paymentData.shippingData.destination.name,
            phone: paymentData.shippingData.destination.phone,
            email: paymentData.shippingData.destination.email,
          } : undefined,
          // Dirección completa de DrEnvío
          address: paymentData.shippingData.destination ? {
            country: paymentData.shippingData.destination.country,
            state: paymentData.shippingData.destination.state,
            city: paymentData.shippingData.destination.city,
            postalCode: paymentData.shippingData.destination.postal_code,
            addressLine: paymentData.shippingData.destination.street,
            neighborhood: paymentData.shippingData.destination.neighborhood,
            references: paymentData.shippingData.destination.references,
          } : undefined,
        } : paymentData.simpleShipping || paymentData.shippingOption ? {
          // Información combinada de simpleShipping y shippingOption
          carrier: paymentData.shippingOption?.carrier,
          service: paymentData.shippingOption?.service,
          serviceId: paymentData.shippingOption?.service_id,
          insurance: paymentData.shippingOption?.insurance || 0,
          packages: [], // No hay paquetes en simpleShipping
          // Contacto detallado de simpleShipping
          contact: paymentData.simpleShipping?.contact ? {
            emailOrPhone: paymentData.simpleShipping.contact.emailOrPhone,
            firstName: paymentData.simpleShipping.contact.firstName,
            lastName: paymentData.simpleShipping.contact.lastName,
            phone: paymentData.simpleShipping.contact.phone,
            email: paymentData.simpleShipping.contact.emailOrPhone?.includes('@') 
              ? paymentData.simpleShipping.contact.emailOrPhone 
              : undefined,
            name: `${paymentData.simpleShipping.contact.firstName || ''} ${paymentData.simpleShipping.contact.lastName || ''}`.trim(),
          } : undefined,
          // Dirección completa de simpleShipping
          address: paymentData.simpleShipping?.address ? {
            country: paymentData.simpleShipping.address.country,
            state: paymentData.simpleShipping.address.state,
            city: paymentData.simpleShipping.address.city,
            postalCode: paymentData.simpleShipping.address.postalCode,
            addressLine: paymentData.simpleShipping.address.addressLine,
            addressLine2: paymentData.simpleShipping.address.addressLine2,
            neighborhood: paymentData.simpleShipping.address.neighborhood,
            references: paymentData.simpleShipping.address.references,
          } : undefined,
          // Opción de envío seleccionada
          shippingOption: paymentData.shippingOption ? {
            carrier: paymentData.shippingOption.carrier,
            service: paymentData.shippingOption.service,
            serviceName: paymentData.shippingOption.service,
            currency: paymentData.shippingOption.currency,
            price: paymentData.shippingOption.price,
            estimatedDays: paymentData.shippingOption.days ? parseInt(paymentData.shippingOption.days) : undefined,
            description: `${paymentData.shippingOption.carrier} - ${paymentData.shippingOption.service}`,
          } : undefined,
        } : undefined, // Información completa de envío
        createdAt: new Date(),
      });

      await order.save();
      this.logger.log(`Order created from payment: ${order._id} (${orderNumber}) for user ${paymentData.userId}`);
      
      // Enviar email de confirmación si tenemos email del cliente
      if (paymentData.customerEmail && paymentData.customerName) {
        console.log(`📧 [ORDER SERVICE] Preparando envío de email de confirmación a: ${paymentData.customerEmail} para orden ${orderNumber}`);
        try {
          await this.orderNotificationService.sendOrderConfirmationEmail(
            order, 
            paymentData.customerEmail, 
            paymentData.customerName
          );
          console.log(`✅ [ORDER SERVICE] Email de confirmación enviado exitosamente a: ${paymentData.customerEmail}`);
          this.logger.log(`Order confirmation email sent to ${paymentData.customerEmail}`);
        } catch (emailError) {
          console.log(`❌ [ORDER SERVICE] Error enviando email de confirmación a: ${paymentData.customerEmail}`, emailError);
          this.logger.error(`Failed to send order confirmation email:`, emailError);
          // No lanzamos el error para no afectar la creación de la orden
        }
      } else {
        console.log(`⚠️ [ORDER SERVICE] No se proporcionó email/nombre del cliente para orden ${orderNumber}, omitiendo notificación por email`);
        this.logger.warn(`No customer email/name provided for order ${orderNumber}, skipping email notification`);
      }
      
      return order;
    } catch (error) {
      this.logger.error('Error creating order from payment:', error);
      throw new InternalServerErrorException(`Failed to create order: ${error.message}`);
    }
  }

  // ========== DRENVÍO DESHABILITADO TEMPORALMENTE ==========
  async generateShipmentForOrder(orderId: string, shippingData: any) {
    // MÉTODO COMENTADO - DrEnvío deshabilitado temporalmente
    this.logger.log(`⚠️ [ORDER] DrEnvío está deshabilitado temporalmente - Método generateShipmentForOrder llamado para orden: ${orderId}`);
    return {
      success: false,
      message: 'DrEnvío shipping is temporarily disabled',
      orderId
    };
    
    /* CÓDIGO ORIGINAL - DESCOMENTAR CUANDO SE REACTIVE DRENVÍO
    try {
      this.logger.log(`🚚 [ORDER] Generating shipment for order: ${orderId}`);
      console.log(`🚚 [ORDER] Starting shipment generation for order: ${orderId}`);

      const order = await this.orderModel.findById(orderId);
      if (!order) {
        this.logger.error(`🚚 [ORDER] Order not found: ${orderId}`);
        console.error(`🚚 [ORDER] Order not found: ${orderId}`);
        throw new NotFoundException('Order not found');
      }

      if (!shippingData) {
        this.logger.error(`🚚 [ORDER] Shipping data is required for order: ${orderId}`);
        console.error(`🚚 [ORDER] Shipping data is required for order: ${orderId}`);
        throw new BadRequestException('Shipping data is required');
      }

      // Validar que la orden esté en estado válido para generar envío
      if (order.status !== 'paid') {
        this.logger.error(`🚚 [ORDER] Order ${orderId} is not in paid status: ${order.status}`);
        console.error(`🚚 [ORDER] Order ${orderId} is not in paid status: ${order.status}`);
        throw new BadRequestException(`Order must be in 'paid' status to generate shipment. Current status: ${order.status}`);
      }

      this.logger.log(`🚚 [ORDER] Order found, proceeding with shipment generation:`, {
        orderId: order._id,
        userId: order.userId,
        status: order.status,
        hasShippingInfo: !!order.shippingInfo
      });
      console.log(`🚚 [ORDER] Order details:`, {
        orderId: order._id,
        userId: order.userId,
        status: order.status,
        shippingCost: order.shippingCost
      });

      const createShipmentDto: CreateShipmentDto = {
        orderId: orderId,
        shippingData: shippingData,
      };

      this.logger.log(`🚚 [ORDER] Calling DrEnvío service for order: ${orderId}`);
      console.log(`🚚 [ORDER] Calling DrEnvío service...`);

      const shipmentResponse = await this.drenvioService.generateShipmentWithDrEnvio(
        order.userId.toString(),
        createShipmentDto,
      );

      this.logger.log(`🚚 [ORDER] DrEnvío response received:`, {
        orderId,
        shipmentId: shipmentResponse.shipmentId,
        trackingNumber: shipmentResponse.trackingNumber,
        status: shipmentResponse.status
      });
      console.log(`🚚 [ORDER] DrEnvío response:`, {
        shipmentId: shipmentResponse.shipmentId,
        trackingNumber: shipmentResponse.trackingNumber,
        status: shipmentResponse.status
      });

      this.logger.log(`🚚 [ORDER] Updating order status to 'shipped' for order: ${orderId}`);
      console.log(`🚚 [ORDER] Updating order status...`);

      // Actualizar la orden con información del envío
      order.status = 'shipped';
      if (order.shippingInfo) {
        order.shippingInfo.trackingNumber = shipmentResponse.trackingNumber;
        order.shippingInfo.estimatedDelivery = shipmentResponse.estimatedDeliveryDate;
      }
      await order.save();

      this.logger.log(`🚚 [ORDER] Shipment generated successfully for order ${orderId}: ${shipmentResponse.trackingNumber}`);
      console.log(`🚚 [ORDER] ✅ Shipment completed for order ${orderId} - Tracking: ${shipmentResponse.trackingNumber}`);

      return {
        success: true,
        shipment: shipmentResponse,
        order: order,
      };
    } catch (error) {
      this.logger.error(`🚚 [ORDER] Error generating shipment for order ${orderId}:`, error);
      console.error(`🚚 [ORDER] Error generating shipment:`, {
        orderId,
        error: error.message,
        stack: error.stack
      });

      // Manejar diferentes tipos de errores
      if (error instanceof BadRequestException) {
        // Error de validación - no reintentar
        this.logger.error(`🚚 [ORDER] Validation error for order ${orderId}: ${error.message}`);
        throw error;
      } else if (error.message?.includes('Circuit breaker')) {
        // Circuit breaker abierto - servicio temporalmente no disponible
        this.logger.error(`🚚 [ORDER] DrEnvío service unavailable for order ${orderId}: ${error.message}`);
        throw new BadRequestException('Shipping service temporarily unavailable. Please try again later.');
      } else if (error.message?.includes('timeout') || error.message?.includes('ECONNABORTED')) {
        // Timeout - posible reintento
        this.logger.error(`🚚 [ORDER] Timeout error for order ${orderId}: ${error.message}`);
        throw new BadRequestException('Shipping request timed out. Please try again.');
      } else if (error.message?.includes('authentication') || error.message?.includes('401')) {
        // Error de autenticación - problema de configuración
        this.logger.error(`🚚 [ORDER] Authentication error for order ${orderId}: ${error.message}`);
        throw new InternalServerErrorException('Shipping service configuration error. Please contact support.');
      } else {
        // Error genérico
        this.logger.error(`🚚 [ORDER] Generic error for order ${orderId}: ${error.message}`);
        throw new BadRequestException(`Failed to generate shipment: ${error.message}`);
      }
    }
    FIN CÓDIGO ORIGINAL */
  }
  // ========== FIN DRENVÍO DESHABILITADO ==========

  async getUserOrders(userId: string, limit: number = 10, offset: number = 0) {
    try {
      const orders = await this.orderModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate('items.product')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      // Optimizar respuesta eliminando información duplicada
      const optimizedOrders = orders.map(order => {
        const optimizedOrder = order.toObject() as any;
        
        // Optimizar items eliminando duplicados
        optimizedOrder.items = order.items.map((item: any) => {
          const optimizedItem = {
            _id: item._id,
            quantity: item.quantity,
            size: item.size,
            reservedStock: item.reservedStock,
            stockReleased: item.stockReleased,
            // Usar solo productSnapshot (más completo y actualizado al momento de la compra)
            productSnapshot: item.productSnapshot || {
              name: item.productName || 'Producto no disponible',
              description: '',
              price: item.price,
              images: [],
              category: '',
              brand: '',
              sku: ''
            },
            // Mantener solo el ID del producto para referencias internas
            productId: item.product ? item.product._id : null
          };
          
          return optimizedItem;
        });

        return optimizedOrder;
      });

      return optimizedOrders;
    } catch (error) {
      this.logger.error('Error fetching user orders:', error);
      throw new InternalServerErrorException('Failed to fetch orders');
    }
  }

  async getUserOrderById(userId: string, orderId: string) {
    try {
      const order = await this.orderModel
        .findOne({ _id: orderId, userId: new Types.ObjectId(userId) })
        .populate('items.product')
        .exec();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Optimizar respuesta eliminando información duplicada
      const optimizedOrder = order.toObject() as any;
      
      // Optimizar items eliminando duplicados
      optimizedOrder.items = order.items.map((item: any) => {
        const optimizedItem = {
          _id: item._id,
          quantity: item.quantity,
          size: item.size,
          reservedStock: item.reservedStock,
          stockReleased: item.stockReleased,
          // Usar solo productSnapshot (más completo y actualizado al momento de la compra)
          productSnapshot: item.productSnapshot || {
            name: item.productName || 'Producto no disponible',
            description: '',
            price: item.price,
            images: [],
            category: '',
            brand: '',
            sku: ''
          },
          // Mantener solo el ID del producto para referencias internas
          productId: item.product ? item.product._id : null
        };
        
        return optimizedItem;
      });

      return optimizedOrder;
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

  /**
   * Libera el stock reservado de una orden
   */
  async releaseOrderStock(orderId: string): Promise<void> {
    try {
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      for (const item of order.items) {
        if (item.product && !item.stockReleased) {
          try {
            // Liberar stock en el producto (con talle específico)
            await this.productsService.releaseStock(
              item.product.toString(), 
              item.reservedStock,
              item.reservedStockSize || item.size
            );
            
            // Marcar como liberado
            item.stockReleased = true;
          } catch (error) {
            this.logger.error(`Error releasing stock for product ${item.product}:`, error);
          }
        }
      }

      await order.save();
      this.logger.log(`Stock released for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Error releasing stock for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Reserva stock para una orden
   */
  async reserveOrderStock(orderId: string): Promise<void> {
    try {
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      for (const item of order.items) {
        if (item.product && !item.stockReleased) {
          try {
            // Reservar stock en el producto (con talle específico)
            await this.productsService.reserveStock(
              item.product.toString(), 
              item.reservedStock,
              item.size
            );
          } catch (error) {
            this.logger.error(`Error reserving stock for product ${item.product}:`, error);
            throw error;
          }
        }
      }

      this.logger.log(`Stock reserved for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Error reserving stock for order ${orderId}:`, error);
      throw error;
    }
  }


  async processCheckoutWithAddress(userId: string, checkoutRequestDto: CheckoutRequestDto) {
    try {
      const { shippingAddress, paymentMethod, couponCode, notes } = checkoutRequestDto;
      
      // Obtener carrito del usuario
      const cart: Cart = await this.cartService.getCartForInternalUse(userId);
      if (!cart) {
        throw new NotFoundException('Carrito no encontrado');
      }

      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      let finalShippingAddress;

      // Procesar dirección de envío
      if (shippingAddress.savedAddressId) {
        // Usar dirección guardada
        finalShippingAddress = await this.addressService.getAddressById(userId, shippingAddress.savedAddressId);
      } else {
        // Crear nueva dirección
        if (shippingAddress.saveAddress) {
          // Guardar la nueva dirección
          finalShippingAddress = await this.addressService.createAddress(userId, {
            name: shippingAddress.name || 'Dirección de envío',
            street: shippingAddress.street!,
            street2: shippingAddress.street2,
            city: shippingAddress.city!,
            state: shippingAddress.state!,
            postalCode: shippingAddress.postalCode!,
            country: shippingAddress.country || 'México',
            contactName: shippingAddress.contactName!,
            contactPhone: shippingAddress.contactPhone!,
            instructions: shippingAddress.instructions,
            isDefault: false,
            saveAddress: true,
          });
        } else {
          // Solo validar sin guardar
          await this.addressService.validateAddressForShipping(shippingAddress);
          finalShippingAddress = {
            _id: 'temp',
            ...shippingAddress,
            country: shippingAddress.country || 'México',
          };
        }
      }

      // Validar productos y calcular totales
      const validatedItems: any[] = [];
      let subtotal = 0;

      for (const item of cart.items) {
        const product = await this.productsService.findById(item.product.toString());
        if (!product) {
          throw new NotFoundException(`Producto ${item.product} no encontrado`);
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          productId: item.product.toString(),
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          total: itemTotal,
        });
      }

      // Aplicar cupón si existe (TODO: implementar en CartService)
      let discount = 0;
      let appliedCoupon = null;
      if (couponCode) {
        // TODO: Implementar applyCoupon en CartService
        // const couponResult = await this.cartService.applyCoupon(userId, couponCode);
        // if (couponResult.success) {
        //   discount = couponResult.discount;
        //   appliedCoupon = couponResult.coupon;
        // }
      }

      // Sin envío por ahora - calcular total sin costo de envío
      const shippingCost = 0;
      const total = subtotal - discount + shippingCost;

      // Crear la orden
      const orderData = {
        userId: new Types.ObjectId(userId),
        items: validatedItems,
        shippingAddress: {
          name: finalShippingAddress.name || 'Dirección de envío',
          street: finalShippingAddress.street,
          street2: finalShippingAddress.street2,
          city: finalShippingAddress.city,
          state: finalShippingAddress.state,
          postalCode: finalShippingAddress.postalCode,
          country: finalShippingAddress.country,
          contactName: finalShippingAddress.contactName,
          contactPhone: finalShippingAddress.contactPhone,
          instructions: finalShippingAddress.instructions,
        },
        subtotal,
        discount,
        shippingCost,
        total,
        status: 'pending',
        paymentMethod,
        notes,
        appliedCoupon: appliedCoupon ? {
          code: (appliedCoupon as any).code,
          discount: (appliedCoupon as any).discount,
          type: (appliedCoupon as any).type,
        } : null,
      };

      const order = new this.orderModel(orderData);
      const savedOrder = await order.save();

      // Limpiar carrito después de crear la orden
      await this.cartService.clearCart(userId);

      this.logger.log(`Order created successfully: ${savedOrder._id}`);

      return {
        success: true,
        order: savedOrder,
        message: 'Checkout procesado exitosamente',
      };
    } catch (error) {
      this.logger.error('Error processing checkout with address:', error);
      throw error;
    }
  }

}