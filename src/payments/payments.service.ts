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
import { MercadoPagoService } from './mercadopago.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentResponseDto } from './dtos/payment-response.dto';
import { PartialCheckoutDto } from './dtos/partial-checkout.dto';
import { CartCheckoutDto } from './dtos/cart-checkout.dto';
import { MercadoPagoCheckoutDto } from './dtos/simple-shipping.dto';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private paypalService: PayPalService,
    private mercadoPagoService: MercadoPagoService,
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

  async createPaymentFromCart(userId: string, checkoutDto: CartCheckoutDto): Promise<PaymentResponseDto> {
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
          returnUrl: checkoutDto.returnUrl,
          cancelUrl: checkoutDto.cancelUrl,
        };

        const paymentResponse = await this.createPayment(userId, createPaymentDto);
        
        // Guardar información de envío con el pago
        const payment = await this.paymentModel.findById(paymentResponse.id);
        if (payment) {
          payment.metadata = {
            ...payment.metadata,
            shippingAddress: checkoutDto.shippingAddress,
            shippingMethod: checkoutDto.shippingMethod || 'standard',
          };
          await payment.save();
        }
        
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
        
        // Guardar información de envío con el pago
        const payment = await this.paymentModel.findById(paymentResponse.id);
        if (payment) {
          payment.metadata = {
            ...payment.metadata,
            shippingAddress: partialCheckoutDto.shippingAddress,
            shippingMethod: partialCheckoutDto.shippingMethod || 'standard',
          };
          await payment.save();
        }
        
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

  async updatePaymentStatus(paymentId: string, status: PaymentStatus | string, errorMessage?: string): Promise<void> {
    try {
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      payment.status = status as PaymentStatus;
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

  async findByMercadoPagoPreference(preferenceId: string): Promise<PaymentDocument | null> {
    try {
      // Buscar por providerPaymentId o por metadata.preferenceId
      const payment = await this.paymentModel.findOne({
        $or: [
          { providerPaymentId: preferenceId },
          { 'metadata.preferenceId': preferenceId }
        ]
      });
      
      return payment;
    } catch (error) {
      this.logger.error('Error finding payment by preference ID:', error);
      return null;
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

  // ==================== MERCADOPAGO METHODS ====================

  async createMercadoPagoPaymentFromCart(
    userId: string, 
    checkoutDto: CartCheckoutDto
  ): Promise<{ 
    id: string; 
    init_point: string; 
    preferenceId: string 
  }> {
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

      // NO reservamos stock aquí - El stock se restará SOLO cuando el pago sea exitoso
      // Esto evita que el stock quede bloqueado si el usuario no completa el pago

      // Preparar items para MercadoPago
      const items = cart.items.map((item) => ({
        title: (item.product as any).name,
        description: (item.product as any).description || '',
        quantity: item.quantity,
        unit_price: (item.product as any).price,
        currency_id: 'MXN', // Pesos mexicanos por defecto
      }));

      const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Crear la preferencia de pago en MercadoPago
      const mpResponse = await this.mercadoPagoService.createCheckoutPreference({
        items,
        externalReference: cart._id?.toString() || '',
        notificationUrl: `${baseUrl}/payments/webhook/mercadopago`,
        backUrls: {
          success: checkoutDto.returnUrl || `${frontendUrl}/payment/success`,
          failure: checkoutDto.cancelUrl || `${frontendUrl}/payment/failure`,
          pending: `${frontendUrl}/payment/pending`,
        },
        autoReturn: 'approved',
        currency: 'MXN',
      });

      // Guardar el pago en la base de datos
      const payment = new this.paymentModel({
        userId,
        provider: PaymentProvider.MERCADOPAGO,
        providerPaymentId: mpResponse.id,
        status: PaymentStatus.PENDING,
        amount: items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
        currency: 'MXN',
        description: `Payment for cart ${cart._id}`,
        orderId: cart._id,
        items: cart.items.map((cartItem) => {
          const product = cartItem.product as any;
          const productId = product._id?.toString() || (typeof product === 'string' ? product : undefined);
          return {
            name: product.name,
            description: product.description || '',
            quantity: cartItem.quantity,
            price: product.price,
            currency: 'MXN',
            productId, // Guardar productId para trazabilidad
          };
        }),
        approvalUrl: mpResponse.init_point,
        metadata: {
          returnUrl: checkoutDto.returnUrl,
          cancelUrl: checkoutDto.cancelUrl,
          preferenceId: mpResponse.id,
          shippingAddress: checkoutDto.shippingAddress,
          shippingMethod: checkoutDto.shippingMethod || 'standard',
          shippingContact: checkoutDto.shippingContact,
          shippingOption: checkoutDto.shippingOption,
        },
      });

      await payment.save();

      this.logger.log(`MercadoPago payment created for user ${userId}: ${payment._id}`);

      // NO limpiar el carrito aquí - se limpiará cuando MercadoPago confirme el pago exitoso
      // El carrito se limpiará en el callback de éxito después de que el pago sea aprobado

      return {
        id: payment._id?.toString() || '',
        init_point: mpResponse.init_point,
        preferenceId: mpResponse.id,
      };
    } catch (error) {
      this.logger.error('Error creating MercadoPago payment from cart:', error);
      throw new BadRequestException(`Failed to create MercadoPago payment: ${error.message}`);
    }
  }

  async createMercadoPagoPartialPaymentFromCart(
    userId: string, 
    partialCheckoutDto: PartialCheckoutDto
  ): Promise<{ 
    id: string; 
    init_point: string; 
    preferenceId: string 
  }> {
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

      for (const partialItem of partialCheckoutDto.items) {
        const cartItem = cart.items.find(item => item._id.toString() === partialItem.itemId);
        if (!cartItem) {
          throw new BadRequestException(`Item ${partialItem.itemId} not found in cart`);
        }

        if (partialItem.quantity > cartItem.quantity) {
          throw new BadRequestException(
            `Requested quantity (${partialItem.quantity}) exceeds cart quantity (${cartItem.quantity}) for item ${partialItem.itemId}`
          );
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
        // Preparar items para MercadoPago
        const items = selectedItems.map((item) => {
          const product = item.cartItem.product as any;
          return {
            title: product.name,
            description: product.description || '',
            quantity: item.requestedQuantity,
            unit_price: product.price,
            currency_id: 'MXN',
          };
        });

        const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Crear la preferencia de pago en MercadoPago
        const mpResponse = await this.mercadoPagoService.createCheckoutPreference({
          items,
          externalReference: cart._id?.toString() || '',
          notificationUrl: `${baseUrl}/payments/webhook/mercadopago`,
          backUrls: {
            success: partialCheckoutDto.returnUrl || `${frontendUrl}/payment/success`,
            failure: partialCheckoutDto.cancelUrl || `${frontendUrl}/payment/failure`,
            pending: `${frontendUrl}/payment/pending`,
          },
          autoReturn: 'approved',
          currency: 'MXN',
        });

        // Guardar el pago en la base de datos
        const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        
        const payment = new this.paymentModel({
          userId,
          provider: PaymentProvider.MERCADOPAGO,
          providerPaymentId: mpResponse.id,
          status: PaymentStatus.PENDING,
          amount: totalAmount,
          currency: 'MXN',
          description: `Partial payment for cart ${cart._id}`,
          orderId: cart._id,
          items: items.map(item => ({
            name: item.title,
            description: item.description,
            quantity: item.quantity,
            price: item.unit_price,
            currency: 'MXN',
          })),
          approvalUrl: mpResponse.init_point,
          metadata: {
            returnUrl: partialCheckoutDto.returnUrl,
            cancelUrl: partialCheckoutDto.cancelUrl,
            preferenceId: mpResponse.id,
            shippingAddress: partialCheckoutDto.shippingAddress,
            shippingMethod: partialCheckoutDto.shippingMethod || 'standard',
          },
        });

        await payment.save();

        this.logger.log(`MercadoPago partial payment created for user ${userId}: ${payment._id}`);

        // Actualizar cantidades en el carrito
        for (const selectedItem of selectedItems) {
          const cartItem = selectedItem.cartItem;
          const newQuantity = cartItem.quantity - selectedItem.requestedQuantity;
          
          if (newQuantity <= 0) {
            await this.cartService.removeFromCart(userId, cartItem._id.toString());
          } else {
            await this.cartService.updateCartItem(userId, cartItem._id.toString(), { quantity: newQuantity });
          }
        }

        return {
          id: payment._id?.toString() || '',
          init_point: mpResponse.init_point,
          preferenceId: mpResponse.id,
        };
      } catch (error) {
        // Si falla la creación del pago, liberar el stock reservado
        for (const item of stockItems) {
          await this.productsService.releaseStock(item.productId, item.quantity);
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Error creating MercadoPago partial payment from cart:', error);
      throw new BadRequestException(`Failed to create MercadoPago partial payment: ${error.message}`);
    }
  }

  // ==================== MERCADOPAGO V2 (CON FORMATO SIMPLE SHIPPING) ====================
  
  async createMercadoPagoPaymentFromCartV2(
    userId: string,
    checkoutDto: MercadoPagoCheckoutDto
  ): Promise<{ 
    id: string; 
    init_point: string; 
    preferenceId: string 
  }> {
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
        // Preparar items para MercadoPago
        const items = cart.items.map((item) => ({
          title: (item.product as any).name,
          description: (item.product as any).description || '',
          quantity: item.quantity,
          unit_price: (item.product as any).price,
          currency_id: 'MXN',
        }));

        // IMPORTANTE: Agregar el costo de envío como un item adicional
        // Esto suma el shipping.price al total que se cobra en MercadoPago
        let shippingCost = 0;
        if (checkoutDto?.shippingOption?.price && checkoutDto.shippingOption.price > 0) {
          shippingCost = checkoutDto.shippingOption.price;
          items.push({
            title: `Envío - ${checkoutDto.shippingOption.carrier} (${checkoutDto.shippingOption.service})`,
            description: `Entrega en ${checkoutDto.shippingOption.days || 'N/A'}`,
            quantity: 1,
            unit_price: shippingCost,
            currency_id: 'MXN',
          });
        }

        const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Crear la preferencia de pago en MercadoPago
        const mpResponse = await this.mercadoPagoService.createCheckoutPreference({
          items,
          externalReference: cart._id?.toString() || '',
          notificationUrl: `${baseUrl}/payments/webhook/mercadopago`,
          backUrls: {
            success: checkoutDto.returnUrl || `${frontendUrl}/payment/success`,
            failure: checkoutDto.cancelUrl || `${frontendUrl}/payment/failure`,
            pending: `${frontendUrl}/payment/pending`,
          },
          autoReturn: 'approved',
          currency: 'MXN',
        });

        // Calcular total (productos + envío)
        const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

        // Guardar el pago en la base de datos con toda la información
        const payment = new this.paymentModel({
          userId,
          provider: PaymentProvider.MERCADOPAGO,
          providerPaymentId: mpResponse.id,
          status: PaymentStatus.PENDING,
          amount: totalAmount,
          currency: 'MXN',
          description: `Payment for cart ${cart._id}`,
          orderId: cart._id,
          items: items.map(item => ({
            name: item.title,
            description: item.description,
            quantity: item.quantity,
            price: item.unit_price,
            currency: 'MXN',
          })),
          approvalUrl: mpResponse.init_point,
          metadata: {
            returnUrl: checkoutDto?.returnUrl,
            cancelUrl: checkoutDto?.cancelUrl,
            preferenceId: mpResponse.id,
            // Guardar información de contacto y dirección (si viene)
            shippingContact: checkoutDto?.simpleShipping ? {
              email: checkoutDto.simpleShipping.contact.emailOrPhone,
              firstName: checkoutDto.simpleShipping.contact.firstName,
              lastName: checkoutDto.simpleShipping.contact.lastName,
              phone: checkoutDto.simpleShipping.contact.phone,
            } : null,
            shippingAddress: checkoutDto?.simpleShipping ? {
              street: checkoutDto.simpleShipping.address.addressLine,
              city: checkoutDto.simpleShipping.address.city,
              state: checkoutDto.simpleShipping.address.state,
              zip: checkoutDto.simpleShipping.address.postalCode,
              country: checkoutDto.simpleShipping.address.country,
            } : null,
            // Guardar información de envío (si viene)
            shippingOption: checkoutDto?.shippingOption ? {
              carrier: checkoutDto.shippingOption.carrier,
              service: checkoutDto.shippingOption.service,
              price: checkoutDto.shippingOption.price,
              days: checkoutDto.shippingOption.days,
              serviceId: checkoutDto.shippingOption.service_id,
              currency: checkoutDto.shippingOption.currency || 'MXN',
            } : null,
          },
        });

        await payment.save();

        this.logger.log(`MercadoPago payment created for user ${userId}: ${payment._id}`);

        // Limpiar el carrito después de crear el pago exitosamente
        await this.cartService.clearCart(userId);

        return {
          id: payment._id?.toString() || '',
          init_point: mpResponse.init_point,
          preferenceId: mpResponse.id,
        };
      } catch (error) {
        // Si falla la creación del pago, liberar el stock reservado
        for (const item of stockItems) {
          await this.productsService.releaseStock(item.productId, item.quantity);
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Error creating MercadoPago payment from cart V2:', error);
      throw new BadRequestException(`Failed to create MercadoPago payment: ${error.message}`);
    }
  }

  // Método para limpiar el carrito del usuario
  async clearUserCart(userId: string): Promise<void> {
    try {
      await this.cartService.clearCart(userId);
      this.logger.log(`Cart cleared for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error clearing cart for user ${userId}:`, error);
      throw error;
    }
  }

  // Método para buscar un producto por nombre
  async findProductByName(name: string): Promise<any> {
    try {
      const products = await this.productsService.search(name);
      return products.find(p => p.name === name);
    } catch (error) {
      this.logger.error(`Error finding product by name ${name}:`, error);
      return null;
    }
  }

  // Método para decrementar el stock de un producto
  async decrementProductStock(productId: string, quantity: number): Promise<void> {
    try {
      // Usamos reserveStock que internamente hace: product.stock -= quantity
      await this.productsService.reserveStock(productId, quantity);
      this.logger.log(`Stock decremented for product ${productId}: ${quantity} units`);
    } catch (error) {
      this.logger.error(`Error decrementing stock for product ${productId}:`, error);
      throw error;
    }
  }
}
