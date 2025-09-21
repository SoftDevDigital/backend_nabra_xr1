import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument, PaymentStatus, PaymentProvider } from './schemas/payment.schema';
import { PayPalService } from './paypal.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentResponseDto } from './dtos/payment-response.dto';
import { PartialCheckoutDto } from './dtos/partial-checkout.dto';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private paypalService: PayPalService,
    @Inject(forwardRef(() => CartService)) private cartService: CartService,
    private productsService: ProductsService,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
  ) {}

  async createPayment(userId: string, createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    try {
      // Crear el pago en PayPal
      const paypalResponse = await this.paypalService.createPayment(createPaymentDto);

      // Guardar el pago en la base de datos
      const payment = new this.paymentModel({
        userId,
        provider: PaymentProvider.PAYPAL,
        providerPaymentId: paypalResponse.id,
        status: PaymentStatus.PENDING,
        amount: createPaymentDto.totalAmount,
        currency: createPaymentDto.currency || 'USD',
        description: createPaymentDto.description,
        orderId: createPaymentDto.orderId,
        items: createPaymentDto.items,
        approvalUrl: paypalResponse.approvalUrl,
        metadata: {
          returnUrl: createPaymentDto.returnUrl,
          cancelUrl: createPaymentDto.cancelUrl,
        },
      });

      await payment.save();

      this.logger.log(`Payment created for user ${userId}: ${payment._id}`);

      return {
        id: payment._id?.toString() || '',
        status: paypalResponse.status,
        approvalUrl: paypalResponse.approvalUrl,
      };
    } catch (error) {
      this.logger.error('Error creating payment:', error);
      throw new BadRequestException(`Payment creation failed: ${error.message}`);
    }
  }

  async capturePayment(paymentId: string, payerId?: string): Promise<PaymentResponseDto> {
    try {
      console.log("entramos en capturePayment");
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('Payment cannot be captured');
      }

      // Capturar el pago en PayPal
      console.log("capturamos el pago en paypal");
      const paypalResponse = await this.paypalService.capturePayment(
        payment.providerPaymentId,
        payerId,
      );

      console.log("paypalResponse", paypalResponse);
      // Actualizar el estado del pago
      payment.status = PaymentStatus.COMPLETED;
      payment.captureId = paypalResponse.id;
      payment.payerId = payerId;
      console.log("guardamos el pago en la base de datos");
      await payment.save();
      console.log("pago guardado en la base de datos");
      this.logger.log(`Payment captured: ${paymentId}`);

      console.log("retornamos el pago");
      return {
        id: payment._id?.toString() || '',
        status: paypalResponse.status,
      };
    } catch (error) {
      this.logger.error('Error capturing payment:', error);
      throw new BadRequestException(`Payment capture failed: ${error.message}`);
    }
  }

  async getPayment(paymentId: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async getUserPayments(userId: string, limit: number = 10, offset: number = 0): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('Payment cannot be cancelled');
      }

      // Cancelar en PayPal (si es posible)
      await this.paypalService.cancelPayment(payment.providerPaymentId);

      // Actualizar estado en la base de datos
      payment.status = PaymentStatus.CANCELLED;
      await payment.save();

      this.logger.log(`Payment cancelled: ${paymentId}`);
      return true;
    } catch (error) {
      this.logger.error('Error cancelling payment:', error);
      return false;
    }
  }

  async createPaymentFromCart(userId: string, returnUrl?: string, cancelUrl?: string): Promise<PaymentResponseDto> {
    try {
      // Validar el carrito antes de proceder
      const validation = await this.cartService.validateCartForCheckout(userId);
      if (!validation.valid) {
        throw new BadRequestException(`Cart validation failed: ${validation.errors.join(', ')}`);
      }

      // Obtener el carrito del usuario
      const cart = await this.cartService.getCart(userId);
      
      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // Preparar items para reserva de stock
      const stockItems = cart.items.map(item => {
        let productId: string;
        
        if (typeof item.product === 'string') {
          productId = item.product;
        } else if (item.product && typeof item.product === 'object') {
          // Si es un objeto poblado, extraer el _id
          productId = (item.product as any)._id?.toString() || (item.product as any).toString();
        } else {
          productId = (item.product as any).toString();
        }

        return {
          productId,
          quantity: item.quantity
        };
      });

      // Reservar stock antes de crear el pago
      const stockReservation = await this.productsService.bulkReserveStock(stockItems);
      if (!stockReservation.success) {
        throw new BadRequestException(`Stock reservation failed: ${stockReservation.errors.join(', ')}`);
      }

      try {
        // Calcular el total y preparar los items
        let totalAmount = 0;
        const items = cart.items.map((item) => {
          const itemTotal = (item.product as any).price * item.quantity;
          totalAmount += itemTotal;

          return {
            name: (item.product as any).name,
            description: (item.product as any).description || '',
            quantity: item.quantity,
            price: (item.product as any).price,
            currency: 'USD',
          };
        });

        const createPaymentDto: CreatePaymentDto = {
          orderId: cart._id?.toString() || '',
          description: `Payment for cart ${cart._id}`,
          items,
          totalAmount,
          currency: 'USD',
          returnUrl,
          cancelUrl,
        };

        const paymentResponse = await this.createPayment(userId, createPaymentDto);
        
        // Limpiar el carrito después de crear el pago exitosamente
        await this.cartService.clearCart(userId);
        
        return paymentResponse;
      } catch (error) {
        // Si falla la creación del pago, liberar el stock reservado
        for (const item of stockItems) {
          await this.productsService.releaseStock(item.productId, item.quantity);
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Error creating payment from cart:', error);
      throw new BadRequestException(`Failed to create payment from cart: ${error.message}`);
    }
  }

  async createPartialPaymentFromCart(userId: string, partialCheckoutDto: PartialCheckoutDto): Promise<PaymentResponseDto> {
    try {
      // Obtener el carrito del usuario
      const cart = await this.cartService.getCart(userId);
      
      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // Validar que todos los items solicitados existen en el carrito
      const selectedItems: Array<{
        cartItem: any;
        requestedQuantity: number;
      }> = [];
      let totalAmount = 0;

      for (const partialItem of partialCheckoutDto.items) {
        const cartItem = cart.items.find(item => item._id.toString() === partialItem.itemId);
        if (!cartItem) {
          throw new BadRequestException(`Item ${partialItem.itemId} not found in cart`);
        }

        if (partialItem.quantity > cartItem.quantity) {
          throw new BadRequestException(`Requested quantity (${partialItem.quantity}) exceeds cart quantity (${cartItem.quantity}) for item ${partialItem.itemId}`);
        }

        // Extraer ID del producto correctamente
        let productId: string;
        if (typeof cartItem.product === 'string') {
          productId = cartItem.product;
        } else if (cartItem.product && typeof cartItem.product === 'object') {
          productId = (cartItem.product as any)._id?.toString() || (cartItem.product as any).toString();
        } else {
          productId = (cartItem.product as any).toString();
        }

        // Validar stock disponible
        const stockCheck = await this.productsService.checkStockAvailability(
          productId,
          partialItem.quantity
        );

        if (!stockCheck.available) {
          throw new BadRequestException(`Insufficient stock for item ${partialItem.itemId}: ${stockCheck.message}`);
        }

        selectedItems.push({
          cartItem,
          requestedQuantity: partialItem.quantity
        });
      }

      // Preparar items para reserva de stock
      const stockItems = selectedItems.map(item => {
        let productId: string;
        if (typeof item.cartItem.product === 'string') {
          productId = item.cartItem.product;
        } else if (item.cartItem.product && typeof item.cartItem.product === 'object') {
          productId = (item.cartItem.product as any)._id?.toString() || (item.cartItem.product as any).toString();
        } else {
          productId = (item.cartItem.product as any).toString();
        }

        return {
          productId,
          quantity: item.requestedQuantity
        };
      });

      // Reservar stock
      const stockReservation = await this.productsService.bulkReserveStock(stockItems);
      if (!stockReservation.success) {
        throw new BadRequestException(`Stock reservation failed: ${stockReservation.errors.join(', ')}`);
      }

      try {
        // Preparar items para el pago
        const paymentItems = selectedItems.map((item) => {
          const product = item.cartItem.product as any;
          const itemTotal = product.price * item.requestedQuantity;
          totalAmount += itemTotal;

          return {
            name: product.name,
            description: product.description || '',
            quantity: item.requestedQuantity,
            price: product.price,
            currency: 'USD',
          };
        });

        const createPaymentDto: CreatePaymentDto = {
          orderId: cart._id?.toString() || '',
          description: `Partial payment for cart ${cart._id}`,
          items: paymentItems,
          totalAmount,
          currency: 'USD',
          returnUrl: partialCheckoutDto.returnUrl,
          cancelUrl: partialCheckoutDto.cancelUrl,
        };

        const paymentResponse = await this.createPayment(userId, createPaymentDto);
        
        // Actualizar cantidades en el carrito
        for (const selectedItem of selectedItems) {
          const cartItem = selectedItem.cartItem;
          const newQuantity = cartItem.quantity - selectedItem.requestedQuantity;
          
          if (newQuantity <= 0) {
            // Remover el item del carrito
            await this.cartService.removeFromCart(userId, cartItem._id.toString());
          } else {
            // Actualizar la cantidad
            await this.cartService.updateCartItem(userId, cartItem._id.toString(), { quantity: newQuantity });
          }
        }
        
        return paymentResponse;
      } catch (error) {
        // Si falla la creación del pago, liberar el stock reservado
        for (const item of stockItems) {
          await this.productsService.releaseStock(item.productId, item.quantity);
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Error creating partial payment from cart:', error);
      throw new BadRequestException(`Failed to create partial payment from cart: ${error.message}`);
    }
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus, errorMessage?: string): Promise<void> {
    try {
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      payment.status = status;
      if (errorMessage) {
        payment.errorMessage = errorMessage;
      }
      
      await payment.save();
      this.logger.log(`Payment status updated: ${paymentId} -> ${status}`);
    } catch (error) {
      this.logger.error('Error updating payment status:', error);
      throw error;
    }
  }

  async capturePaymentByToken(paypalToken: string, payerId: string): Promise<PaymentResponseDto> {
    try {
      console.log("Buscando pago por token PayPal:", paypalToken);
      
      // Buscar el pago por el token de PayPal (providerPaymentId)
      const payment = await this.paymentModel.findOne({ 
        providerPaymentId: paypalToken 
      });
      
      if (!payment) {
        throw new NotFoundException(`Payment not found for PayPal token: ${paypalToken}`);
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('Payment cannot be captured');
      }

      // Capturar el pago en PayPal
      console.log("Capturando pago en PayPal");
      const paypalResponse = await this.paypalService.capturePayment(paypalToken, payerId);

      console.log("PayPal Response:", paypalResponse);
      
      // Actualizar el estado del pago
      payment.status = PaymentStatus.COMPLETED;
      payment.captureId = paypalResponse.id;
      payment.payerId = payerId;
      
      await payment.save();
      this.logger.log(`Payment captured by token: ${paypalToken} -> ${payment._id}`);

      // Crear orden automáticamente cuando el pago es exitoso
      try {
        const orderData = {
          userId: payment.userId.toString(),
          paymentId: payment._id?.toString() || '',
          items: payment.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            productId: undefined, // No tenemos esta info en el pago actual
          })),
          totalAmount: payment.amount,
          currency: payment.currency,
        };

        const order = await this.ordersService.createOrderFromPayment(orderData);
        this.logger.log(`Order created automatically from payment: ${order._id}`);
      } catch (orderError) {
        this.logger.error('Failed to create order from payment:', orderError);
        // No lanzamos error aquí para no afectar el pago exitoso
      }

      return {
        id: payment._id?.toString() || '',
        status: paypalResponse.status,
      };
    } catch (error) {
      this.logger.error('Error capturing payment by token:', error);
      throw new BadRequestException(`Payment capture failed: ${error.message}`);
    }
  }

  async cancelPaymentByToken(paypalToken: string): Promise<void> {
    try {
      console.log("Cancelando pago por token PayPal:", paypalToken);
      
      // Buscar el pago por el token de PayPal
      const payment = await this.paymentModel.findOne({ 
        providerPaymentId: paypalToken 
      });
      
      if (!payment) {
        this.logger.warn(`Payment not found for cancellation with token: ${paypalToken}`);
        return; // No lanzar error, puede ser que el pago no se haya creado aún
      }

      if (payment.status !== PaymentStatus.PENDING) {
        this.logger.warn(`Payment ${payment._id} cannot be cancelled, current status: ${payment.status}`);
        return;
      }

      // Actualizar estado en la base de datos
      payment.status = PaymentStatus.CANCELLED;
      payment.errorMessage = 'Payment cancelled by user';
      await payment.save();

      this.logger.log(`Payment cancelled by token: ${paypalToken} -> ${payment._id}`);
    } catch (error) {
      this.logger.error('Error cancelling payment by token:', error);
      throw new BadRequestException(`Payment cancellation failed: ${error.message}`);
    }
  }
}
