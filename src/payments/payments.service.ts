import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument, PaymentStatus, PaymentProvider } from './schemas/payment.schema';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentResponseDto } from './dtos/payment-response.dto';
import { PartialCheckoutDto } from './dtos/partial-checkout.dto';
import { PaymentWithShippingDto } from './dtos/payment-with-shipping.dto';
import { CheckoutWithShippingDto } from './dtos/checkout-with-shipping.dto';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { MercadoPagoService } from './mercadopago.service';
import { UsersService } from '../users/users.service';
import { DrEnvioService } from '../shipping/drenvio.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  
  // Caché temporal para datos de envío (en memoria) - MEJORADO: También persistir en DB
  private shippingDataCache = new Map<string, any>();

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private mpService: MercadoPagoService,
    @Inject(forwardRef(() => CartService)) private cartService: CartService,
    private productsService: ProductsService,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    private usersService: UsersService,
    private drenvioService: DrEnvioService,
    private configService: ConfigService,
  ) {}

  /**
   * Maneja la actualización del carrito para pagos parciales
   */
  async handlePartialCartUpdate(payment: PaymentDocument): Promise<void> {
    try {
      const selectedItems = payment.metadata?.selectedItems || [];
      console.log(`🛒 [PARTIAL-CART] Actualizando carrito con ${selectedItems.length} items procesados`);
      
      for (const selectedItem of selectedItems) {
        // Reducir la cantidad en el carrito por la cantidad procesada
        await this.cartService.updateCartItem(
          payment.userId.toString(),
          selectedItem.cartItemId,
          { quantity: selectedItem.originalQuantity - selectedItem.requestedQuantity }
        );
        console.log(`✅ [PARTIAL-CART] Item ${selectedItem.cartItemId} actualizado: ${selectedItem.originalQuantity} → ${selectedItem.originalQuantity - selectedItem.requestedQuantity}`);
      }
      
      console.log(`✅ [PARTIAL-CART] Carrito actualizado exitosamente para pago parcial`);
    } catch (error) {
      console.error(`❌ [PARTIAL-CART] Error actualizando carrito:`, error);
      this.logger.error(`Failed to update cart for partial payment:`, error);
      throw error;
    }
  }

  /**
   * Persiste datos de envío en el pago para evitar pérdida de datos
   */
  async persistShippingData(paymentId: string, shippingData: any): Promise<void> {
    try {
      await this.paymentModel.updateOne(
        { _id: paymentId },
        { 
          $set: { 
            'metadata.shippingData': shippingData.shippingData,
            'metadata.simpleShipping': shippingData.simpleShipping,
            'metadata.shippingOption': shippingData.shippingOption,
            'metadata.shippingAddress': shippingData.shippingAddress,
            'metadata.shippingContact': shippingData.shippingContact,
            'metadata.shippingCost': shippingData.shippingCost,
            'metadata.shippingDataTimestamp': new Date()
          } 
        }
      );
      console.log(`✅ [SHIPPING-DATA] Datos de envío persistidos en DB para pago: ${paymentId}`);
    } catch (error) {
      console.error(`❌ [SHIPPING-DATA] Error persistiendo datos de envío:`, error);
      this.logger.error(`Failed to persist shipping data for payment ${paymentId}:`, error);
    }
  }

  /**
   * Valida la firma del webhook de MercadoPago para seguridad
   */
  private validateWebhookSignature(query: any, headers: Record<string, any>): boolean {
    try {
      const webhookSecret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
      
      // Si no hay secret configurado, permitir en desarrollo
      if (!webhookSecret) {
        if (process.env.NODE_ENV === 'production') {
          this.logger.warn('⚠️ MERCADOPAGO_WEBHOOK_SECRET no configurado en producción - webhooks no validados');
          return false;
        }
        console.log(`⚠️ [WEBHOOK-SECURITY] No hay webhook secret configurado - permitiendo en desarrollo`);
        return true;
      }

      const signature = headers['x-signature'];
      if (!signature) {
        console.log(`❌ [WEBHOOK-SECURITY] No se encontró firma x-signature`);
        return false;
      }

      // Validación básica de formato de firma
      if (!signature.includes('ts=') || !signature.includes('v1=')) {
        console.log(`❌ [WEBHOOK-SECURITY] Formato de firma inválido`);
        return false;
      }

      // TODO: Implementar validación completa de HMAC-SHA256
      // Por ahora, validación básica de formato
      console.log(`✅ [WEBHOOK-SECURITY] Firma validada básicamente`);
      return true;
    } catch (error) {
      this.logger.error('Error validating webhook signature:', error);
      return false;
    }
  }

  private async getUserInfo(userId: string): Promise<{ email: string; firstName: string; lastName: string }> {
    try {
      const user = await this.usersService.getProfile(userId);
      
      // Validar que el email existe y es válido
      if (!user.email || !user.email.includes('@')) {
        throw new Error('Invalid or missing email address');
      }
      
      return {
        email: user.email,
        firstName: user.firstName || 'Usuario',
        lastName: user.lastName || 'Nabra'
      };
    } catch (error) {
      this.logger.error(`Could not fetch user info for ${userId}:`, error);
      // NO enviar email si no tenemos datos válidos del usuario
      throw new Error(`No se pudo obtener información del usuario ${userId}: ${error.message}`);
    }
  }

  // --- Mercado Pago Checkout Pro ---
  async createMercadoPagoCheckoutFromCart(
    userId: string,
    checkoutData: CheckoutWithShippingDto = {},
  ): Promise<{ id: string; init_point: string }> {
    try {
      console.log(`🛒 [CHECKOUT-START] Iniciando checkout para usuario: ${userId}`);
      console.log(`🛒 [CHECKOUT-START] checkoutData recibido:`, {
        hasShippingData: !!checkoutData.shippingData,
        hasSimpleShipping: !!checkoutData.simpleShipping,
        shippingDataKeys: checkoutData.shippingData ? Object.keys(checkoutData.shippingData) : [],
        shipmentPrice: checkoutData.shippingData?.shipment?.price
      });

      // Obtener el carrito del usuario primero
      const cart = await this.cartService.getCartForInternalUse(userId);
      
      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException({
          message: 'Your cart is empty. Please add items before proceeding to checkout.',
          error: 'EMPTY_CART',
          statusCode: 400,
        });
      }

      // Validar el stock del carrito antes de proceder
      await this.cartService.validateCartBeforeCheckout(userId);


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
          quantity: item.quantity,
          size: item.size // Incluir el talle para reserva específica
        };
      });

      // Reservar stock antes de crear el pago
      const stockReservation = await this.productsService.bulkReserveStock(stockItems);
      if (!stockReservation.success) {
        throw new BadRequestException(`Stock reservation failed: ${stockReservation.errors.join(', ')}`);
      }

      try {
        // Calcular total e items
        let totalAmount = 0;
        const currency = process.env.MERCADOPAGO_CURRENCY || 'ARS';
        this.logger.log(`🔍 [DEBUG] PaymentsService currency: ${currency}`);
        const mpItems = cart.items.map((item) => {
          const product = item.product as any;
          const itemTotal = product.price * item.quantity;
          totalAmount += itemTotal;
          return {
            id: item._id.toString(), // ID único del item del carrito
            title: product.name,
            description: product.description || '',
            quantity: item.quantity,
            unit_price: Number(product.price),
            currency_id: currency,
          };
        });

        // Agregar costo de envío si se proporcionan datos de envío
        let shippingCost = 0;
        console.log(`📦 [CHECKOUT-SHIPPING] ===== PROCESANDO DATOS DE ENVÍO =====`);
        console.log(`📦 [CHECKOUT-SHIPPING] Tipo de envío recibido:`);
        console.log(`📦 [CHECKOUT-SHIPPING] - shippingData (DrEnvío):`, !!checkoutData.shippingData);
        console.log(`📦 [CHECKOUT-SHIPPING] - simpleShipping (Dirección):`, !!checkoutData.simpleShipping);
        console.log(`📦 [CHECKOUT-SHIPPING] - shippingOption (Transportista):`, !!checkoutData.shippingOption);
        
        if (checkoutData.shippingData && checkoutData.shippingData.shipment) {
          shippingCost = checkoutData.shippingData.shipment.price;
          console.log(`📦 [CHECKOUT-SHIPPING] ✅ USANDO: DrEnvío`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Costo: $${shippingCost}`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Transportista: ${checkoutData.shippingData.shipment.carrier}`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Servicio: ${checkoutData.shippingData.shipment.service}`);
          
          if (shippingCost > 0) {
            mpItems.push({
              id: 'shipping',
              title: `Envío - ${checkoutData.shippingData.shipment.carrier} ${checkoutData.shippingData.shipment.service}`,
              description: `Servicio de envío ${checkoutData.shippingData.shipment.service} por ${checkoutData.shippingData.shipment.carrier}`,
              quantity: 1,
              unit_price: Number(shippingCost),
              currency_id: currency,
            });
            totalAmount += shippingCost;
            console.log(`📦 [CHECKOUT-SHIPPING] ✅ Item de envío agregado a MercadoPago`);
            console.log(`📦 [CHECKOUT-SHIPPING] - Total actualizado: $${totalAmount}`);
          }
        } else if (checkoutData.shippingOption && checkoutData.shippingOption.price) {
          // Usar información de shippingOption si está disponible
          shippingCost = checkoutData.shippingOption.price;
          console.log(`📦 [CHECKOUT-SHIPPING] ✅ USANDO: Opción de Transportista`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Costo: $${shippingCost}`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Transportista: ${checkoutData.shippingOption.carrier || 'No especificado'}`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Servicio: ${checkoutData.shippingOption.service || 'No especificado'}`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Tiempo: ${checkoutData.shippingOption.days || 'No especificado'}`);
          
          if (shippingCost > 0) {
            mpItems.push({
              id: 'shipping',
              title: `Envío - ${checkoutData.shippingOption.carrier || 'Transportista'} ${checkoutData.shippingOption.service || 'Estándar'}`,
              description: `Servicio de envío ${checkoutData.shippingOption.service || 'Estándar'} por ${checkoutData.shippingOption.carrier || 'Transportista'} (${checkoutData.shippingOption.days || 'Entrega estándar'})`,
              quantity: 1,
              unit_price: Number(shippingCost),
              currency_id: currency,
            });
            totalAmount += shippingCost;
            console.log(`📦 [CHECKOUT-SHIPPING] ✅ Item de envío agregado a MercadoPago`);
            console.log(`📦 [CHECKOUT-SHIPPING] - Total actualizado: $${totalAmount}`);
          }
        } else if (checkoutData.simpleShipping) {
          console.log(`📦 [CHECKOUT-SHIPPING] ✅ USANDO: Solo Dirección (sin costo)`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Dirección: ${checkoutData.simpleShipping.address.city}, ${checkoutData.simpleShipping.address.country}`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Cliente: ${checkoutData.simpleShipping.contact.firstName} ${checkoutData.simpleShipping.contact.lastName}`);
          // Para simpleShipping, el costo de envío es 0 por defecto
          shippingCost = 0;
          console.log(`📦 [CHECKOUT-SHIPPING] - Costo: $0 (sin transportista seleccionado)`);
        } else {
          console.log(`📦 [CHECKOUT-SHIPPING] ❌ NO HAY DATOS DE ENVÍO`);
          console.log(`📦 [CHECKOUT-SHIPPING] - Costo: $0`);
          shippingCost = 0;
        }
        
        console.log(`📦 [CHECKOUT-SHIPPING] ===== RESUMEN FINAL =====`);
        console.log(`📦 [CHECKOUT-SHIPPING] - Costo de envío: $${shippingCost}`);
        console.log(`📦 [CHECKOUT-SHIPPING] - Total del carrito: $${totalAmount - shippingCost}`);
        console.log(`📦 [CHECKOUT-SHIPPING] - Total final: $${totalAmount}`);


        // URLs dinámicas basadas en configuración
        const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
        const success = `${baseUrl}/payments/mercadopago/return`;
        const failure = `${baseUrl}/payments/mercadopago/return`;
        const pending = `${baseUrl}/payments/mercadopago/return`;
        const notificationUrl = `${baseUrl}/payments/webhook/mercadopago`;

        const pref = await this.mpService.createCheckoutPreference({
          items: mpItems,
          backUrls: { success, failure, pending },
          notificationUrl,
          externalReference: cart._id?.toString(),
          // MP requiere back_urls.success definido si auto_return = approved
          autoReturn: 'approved',
          currency,
        });

        // Guardar pago local en estado pending
        console.log(`💾 [CHECKOUT-SAVE] Guardando pago con metadata de envío:`, {
          hasShippingData: !!checkoutData.shippingData,
          shippingCost: shippingCost,
          cartId: cart._id?.toString(),
          shippingDataOrigin: checkoutData.shippingData?.origin?.city,
          shippingDataDestination: checkoutData.shippingData?.destination?.city
        });

        const metadataToSave: any = {
          cartId: cart._id?.toString(),
          preferenceId: pref.id,
          hasShipping: !!(checkoutData.shippingData || checkoutData.simpleShipping || checkoutData.shippingOption),
          shippingCost: shippingCost,
          shippingData: checkoutData.shippingData || null,
          simpleShipping: checkoutData.simpleShipping || null,
          shippingOption: checkoutData.shippingOption || null,
          shippingAddress: checkoutData.shippingAddress || null,
          shippingContact: checkoutData.shippingContact || null,
          cartItems: cart.items.map((item: any) => ({
            cartItemId: item._id.toString(),
            productId: (item.product as any)._id?.toString(),
            quantity: item.quantity,
          })),
        };

        console.log(`💾 [CHECKOUT-SAVE] Metadata a guardar:`, {
          hasShipping: metadataToSave.hasShipping,
          shippingCost: metadataToSave.shippingCost,
          hasShippingDataObject: !!metadataToSave.shippingData,
          shippingDataKeys: metadataToSave.shippingData ? Object.keys(metadataToSave.shippingData) : []
        });

        const payment = new this.paymentModel({
          userId,
          provider: PaymentProvider.MERCADOPAGO,
          providerPaymentId: pref.id,
          status: PaymentStatus.PENDING,
          amount: Number(totalAmount.toFixed(2)),
          currency,
          description: `MP preference for cart ${cart._id}`,
          orderId: undefined,
          items: cart.items.map((i: any) => ({
            name: i.product.name,
            description: i.product.description || '',
            quantity: i.quantity,
            price: i.product.price,
            currency,
            productId: i.product._id?.toString(),
            size: i.size,
          })),
          approvalUrl: pref.init_point,
          metadata: metadataToSave,
        });
        
        console.log(`💾 [CHECKOUT-SAVE] Modelo de pago creado, guardando en DB...`);
        await payment.save();
        
        console.log(`✅ [CHECKOUT-SAVE] Pago guardado exitosamente con ID: ${payment._id}`);
        console.log(`✅ [CHECKOUT-SAVE] Metadata guardado:`, {
          keys: Object.keys(payment.metadata || {}),
          hasShipping: payment.metadata?.hasShipping,
          shippingCost: payment.metadata?.shippingCost,
          hasShippingData: !!payment.metadata?.shippingData
        });

        // GUARDAR EN CACHÉ TEMPORAL (por si el metadata no se guarda bien en DB)
        if (checkoutData.shippingData || checkoutData.simpleShipping || checkoutData.shippingOption) {
          const cacheKey = pref.id; // Usar preference ID como key
          this.shippingDataCache.set(cacheKey, {
            shippingData: checkoutData.shippingData || null,
            simpleShipping: checkoutData.simpleShipping || null,
            shippingOption: checkoutData.shippingOption || null,
            shippingAddress: checkoutData.shippingAddress || null,
            shippingContact: checkoutData.shippingContact || null,
            shippingCost: shippingCost,
            timestamp: Date.now(),
            userId: userId
          });
          console.log(`💾 [CACHE] Datos de envío guardados en caché temporal con key: ${cacheKey}`);
          console.log(`💾 [CACHE] Total items en caché: ${this.shippingDataCache.size}`);
          
          // Limpiar caché después de 1 hora
          setTimeout(() => {
            if (this.shippingDataCache.has(cacheKey)) {
              this.shippingDataCache.delete(cacheKey);
              console.log(`🗑️ [CACHE] Datos de envío expirados y eliminados: ${cacheKey}`);
            }
          }, 3600000); // 1 hora
        }

        return pref;
      } catch (error) {
        // Si falla la creación del pago, liberar el stock reservado
        for (const item of stockItems) {
          await this.productsService.releaseStock(item.productId, item.quantity);
        }
        throw error;
      }
    } catch (error) {
      // Si es un error de validación conocido, devolverlo tal como está
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Solo log para errores críticos
      this.logger.error('Critical error creating Mercado Pago checkout:', error);
      
      // Para otros errores, crear un mensaje más limpio
      throw new BadRequestException(`Failed to create Mercado Pago checkout from cart: ${error.message}`);
    }
  }


  async createMercadoPagoPartialCheckoutFromCart(
    userId: string,
    partialCheckoutDto: PartialCheckoutDto,
  ): Promise<{ id: string; init_point: string }> {
    try {
      // Obtener el carrito del usuario
      const cart = await this.cartService.getCartForInternalUse(userId);
      
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
        const currency = process.env.MERCADOPAGO_CURRENCY || 'MXN';
        this.logger.log(`🔍 [DEBUG] PaymentsService currency: ${currency}`);
        const mpItems = selectedItems.map((item) => {
          const product = item.cartItem.product as any;
          const itemTotal = product.price * item.requestedQuantity;
          totalAmount += itemTotal;

          return {
            id: item.cartItem._id.toString(),
            title: product.name,
            description: product.description || '',
            quantity: item.requestedQuantity,
            unit_price: Number(product.price),
            currency_id: currency,
          };
        });

        const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
        const success = partialCheckoutDto.returnUrl || `${baseUrl}/payments/mercadopago/return`;
        const failure = partialCheckoutDto.cancelUrl || `${baseUrl}/payments/mercadopago/return`;
        const pending = `${baseUrl}/payments/mercadopago/return`;

        const notificationUrl = `${baseUrl}/payments/webhook/mercadopago`;

        const pref = await this.mpService.createCheckoutPreference({
          items: mpItems,
          backUrls: { success, failure, pending },
          notificationUrl,
          externalReference: cart._id?.toString(),
          autoReturn: 'approved',
          currency,
        });

        // Guardar pago local en estado pending
        const payment = new this.paymentModel({
          userId,
          provider: PaymentProvider.MERCADOPAGO,
          providerPaymentId: pref.id,
          status: PaymentStatus.PENDING,
          amount: Number(totalAmount.toFixed(2)),
          currency,
          description: `MP partial preference for cart ${cart._id}`,
          orderId: undefined,
          items: selectedItems.map((item) => ({
            name: (item.cartItem.product as any).name,
            description: (item.cartItem.product as any).description || '',
            quantity: item.requestedQuantity,
            price: (item.cartItem.product as any).price,
            currency,
            productId: (item.cartItem.product as any)._id?.toString(),
            size: item.cartItem.size,
          })),
          approvalUrl: pref.init_point,
          metadata: {
            cartId: cart._id?.toString(),
            preferenceId: pref.id,
            isPartial: true,
            selectedItems: selectedItems.map(item => ({
              cartItemId: item.cartItem._id.toString(),
              productId: (item.cartItem.product as any)._id?.toString(),
              requestedQuantity: item.requestedQuantity,
              originalQuantity: item.cartItem.quantity,
            })),
          },
        });
        await payment.save();

        return pref;
      } catch (error) {
        // Si falla la creación del pago, liberar el stock reservado
        for (const item of stockItems) {
          await this.productsService.releaseStock(item.productId, item.quantity);
        }
        throw error;
      }
    } catch (error) {
      // Si es un error de validación conocido, devolverlo tal como está
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Solo log para errores críticos
      this.logger.error('Critical error creating Mercado Pago partial checkout:', error);
      
      // Para otros errores, crear un mensaje más limpio
      throw new BadRequestException(`Failed to create Mercado Pago partial checkout from cart: ${error.message}`);
    }
  }

  async handleMercadoPagoReturn(params: {
    paymentId?: string;
    status?: string;
    merchantOrderId?: string;
    externalReference?: string;
  }) {
    const status = (params.status || '').toLowerCase();
    const isApproved = status === 'approved';
    const isPending = status === 'pending' || status === 'in_process';
    const isFailure = !isApproved && !isPending;

    // Procesar la lógica del pago si es exitoso
    let createdOrderId: string | null = null;
    if (isApproved && params.paymentId) {
      try {
        // Buscar el pago por external_reference o payment_id
        let payment = await this.paymentModel.findOne({ 
          'metadata.cartId': params.externalReference 
        });
        
        if (!payment && params.paymentId) {
          // Buscar por payment_id de MP
          const paymentInfo = await this.mpService.getPaymentById(String(params.paymentId));
          payment = await this.paymentModel.findOne({ 
            providerPaymentId: paymentInfo?.preference_id 
          });
        }

        if (payment && payment.status === PaymentStatus.PENDING) {
          // Verificar si ya existe una orden para este pago (evitar duplicados)
          const existingOrder = await this.ordersService['orderModel'].findOne({ 
            paymentId: (payment as any)._id 
          });
          
          if (existingOrder) {
            console.log(`⚠️ [PAYMENT-RETURN] Ya existe una orden para este pago: ${existingOrder._id}, omitiendo creación duplicada`);
            this.logger.warn(`Order already exists for payment ${(payment as any)._id}, skipping duplicate creation in return handler`);
            // Continuar con la redirección pero sin crear orden duplicada
            createdOrderId = (existingOrder as any)._id?.toString() || null;
          } else {
            // Actualizar pago + crear orden + limpiar carrito
            // Preparar datos antes de procesar
            let userInfo: any = null;
            try {
              userInfo = await this.getUserInfo(payment.userId.toString());
            } catch (error) {
              console.log(`⚠️ [PAYMENT-RETURN] No se pudo obtener email del usuario ${payment.userId}`);
            }

            try {
              this.logger.log(`Starting payment update + order creation + cart cleanup for user ${payment.userId}`);

              // Actualizar estado del pago
              payment.status = PaymentStatus.COMPLETED;
              payment.captureId = String(params.paymentId);
              await payment.save();

              console.log(`📧 [PAYMENT-RETURN] Creando orden para usuario: ${payment.userId}`);
              const order = await this.ordersService.createOrderFromPayment({
                userId: payment.userId.toString(),
                paymentId: (payment as any)._id.toString(),
                items: payment.items.map((it) => ({ 
                  name: it.name, 
                  quantity: it.quantity, 
                  price: it.price 
                })),
                totalAmount: payment.amount,
                currency: payment.currency,
                customerEmail: userInfo?.email,
                customerName: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : undefined,
                shippingData: payment.metadata?.shippingData || null,
                simpleShipping: payment.metadata?.simpleShipping || null,
                shippingOption: payment.metadata?.shippingOption || null,
                shippingCost: payment.metadata?.shippingCost || 0,
              });

              console.log(`✅ [PAYMENT-RETURN] Orden ${order._id} creada exitosamente`);
              createdOrderId = (order as any)._id?.toString() || null;

              // Manejar carrito según tipo de pago
              if (payment.metadata?.isPartial) {
                console.log(`🛒 [PAYMENT-RETURN] Procesando pago parcial...`);
                await this.handlePartialCartUpdate(payment);
              } else {
                console.log(`🛒 [PAYMENT-RETURN] Limpiando carrito para usuario: ${payment.userId}`);
                await this.cartService.clearCart(payment.userId.toString());
                this.logger.log(`Cart cleared for user ${payment.userId} after successful MP return`);
              }

              this.logger.log(`✅ Payment + order + cart cleanup completed successfully`);

            } catch (error) {
              this.logger.error(`❌ Failed processing payment return:`, error);
              console.error('❌ [PAYMENT-RETURN] Error creando orden:', error);
            }
          }
        } else if (payment && payment.status === PaymentStatus.COMPLETED) {
          // El pago ya fue procesado por el webhook, solo limpiar carrito por seguridad
          if (payment.metadata?.isPartial) {
            await this.handlePartialCartUpdate(payment);
          } else {
            await this.cartService.clearCart(payment.userId.toString());
            this.logger.log(`Cart cleared for user ${payment.userId} (already processed by webhook)`);
          }
        }
      } catch (error) {
        this.logger.error('Error procesando retorno de Mercado Pago:', error);
      }
    }

    // Redirigir al frontend
    const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const successPath = process.env.FRONTEND_SUCCESS_PATH || '/orders';
    const failurePath = process.env.FRONTEND_FAILURE_PATH || '/checkout/failure';
    const pendingPath = process.env.FRONTEND_PENDING_PATH || '/checkout/pending';

    let targetPath = isApproved ? successPath : isPending ? pendingPath : failurePath;
    // Si tenemos orderId y estamos aprobados, redirigir a la orden específica
    if (isApproved && createdOrderId) {
      // Si successPath apunta a /orders, construir /orders/:id
      try {
        const successUrl = new URL(successPath, frontendBase);
        // Si la ruta base termina en '/orders', reemplazar por '/orders/{id}'
        if (successUrl.pathname.replace(/\/$/, '') === '/orders') {
          targetPath = `/orders/${createdOrderId}`;
        } else {
          // Si el successPath es personalizado, agregar query param order_id
          const tmp = new URL(targetPath, frontendBase);
          tmp.searchParams.set('order_id', createdOrderId);
          return { redirectUrl: tmp.toString(), orderId: createdOrderId };
        }
      } catch {}
    }

    const url = new URL(targetPath, frontendBase);
    if (params.paymentId) url.searchParams.set('payment_id', String(params.paymentId));
    if (params.status) url.searchParams.set('status', String(params.status));
    if (params.merchantOrderId) url.searchParams.set('merchant_order_id', String(params.merchantOrderId));
    if (params.externalReference) url.searchParams.set('external_reference', String(params.externalReference));

    if (createdOrderId) {
      url.searchParams.set('order_id', createdOrderId);
    }

    return { redirectUrl: url.toString(), orderId: createdOrderId };
  }

  async handleMercadoPagoWebhook(query: any, body: any, headers?: Record<string, any>) {
    // MP envía: topic=payment & id (query) o resource en body
    const topic = query?.topic || query?.type;
    const id = query?.id || (query && query['data.id']) || body?.data?.id;

    console.log(`📨 [WEBHOOK-RECEIVED] Webhook de MercadoPago recibido:`, {
      topic,
      paymentId: id,
      query,
      body
    });

    // ✅ VALIDAR FIRMA DEL WEBHOOK PARA SEGURIDAD
    if (headers && !this.validateWebhookSignature(query, headers)) {
      console.log(`❌ [WEBHOOK-SECURITY] Firma del webhook inválida - rechazando`);
      this.logger.warn(`Invalid webhook signature received from IP: ${headers['x-forwarded-for'] || 'unknown'}`);
      return { ok: false, error: 'Invalid signature' };
    }

    if (topic === 'payment' && id) {
      const paymentInfo = await this.mpService.getPaymentById(String(id));
      const status = String(paymentInfo?.status || '').toLowerCase();

      console.log(`📨 [WEBHOOK-MP-INFO] Información del pago desde MercadoPago:`, {
        status,
        preferenceId: paymentInfo?.preference_id,
        externalRef: paymentInfo?.external_reference
      });

      // Buscar nuestro Payment por metadata/external_reference o por providerPaymentId (preferencia id)
      const externalRef = paymentInfo?.external_reference;
      let payment: PaymentDocument | null = null;
      
      // Primero intentar por preferenceId
      if (paymentInfo?.preference_id) {
        payment = await this.paymentModel.findOne({ providerPaymentId: paymentInfo.preference_id });
        console.log(`🔍 [WEBHOOK] Búsqueda por preferenceId (${paymentInfo.preference_id}):`, payment ? 'ENCONTRADO' : 'NO ENCONTRADO');
      }
      
      // Si no se encuentra y hay externalRef, buscar el pago MÁS RECIENTE con estado PENDING para ese carrito
      if (!payment && externalRef) {
        payment = await this.paymentModel
          .findOne({ 
            'metadata.cartId': externalRef,
            status: PaymentStatus.PENDING // Solo pagos pendientes
          })
          .sort({ createdAt: -1 }) // Más reciente primero
          .exec();
        console.log(`🔍 [WEBHOOK] Búsqueda por cartId (${externalRef}) con status PENDING:`, payment ? `ENCONTRADO (${(payment as any)._id})` : 'NO ENCONTRADO');
      }

      if (!payment) {
        console.log(`⚠️ [WEBHOOK] No se encontró pago en DB para preferenceId: ${paymentInfo?.preference_id}`);
        return { ok: true };
      }

      console.log(`💳 [WEBHOOK] Pago encontrado en DB:`, {
        paymentDbId: (payment as any)._id,
        status: payment.status,
        preferenceId: payment.providerPaymentId
      });

      if (status === 'approved') {

        // ACTUALIZACIÓN ATÓMICA: Cambiar estado de PENDING a COMPLETED en una sola operación
        const updateResult = await this.paymentModel.updateOne(
          { 
            _id: (payment as any)._id,
            status: PaymentStatus.PENDING // Solo actualizar si está PENDING
          },
          { 
            $set: { 
              status: PaymentStatus.COMPLETED,
              captureId: String(paymentInfo.id)
            } 
          }
        );

        if (updateResult.modifiedCount === 0) {
          console.log(`⚠️ [WEBHOOK] Pago ya procesado por otro webhook, omitiendo duplicado`);
          this.logger.warn(`Payment already processed by another webhook: ${(payment as any)._id}`);
          return { ok: true };
        }

        console.log(`✅ [WEBHOOK] Pago actualizado atómicamente a COMPLETED (modificado: ${updateResult.modifiedCount})`);

        // Recargar payment con el estado actualizado
        payment = await this.paymentModel.findById((payment as any)._id);
        
        if (!payment) {
          console.log(`❌ [WEBHOOK] No se pudo recargar el pago después de actualizar`);
          return { ok: false };
        }

        console.log(`💳 [WEBHOOK] Metadata del pago:`, {
          hasMetadata: !!payment.metadata,
          metadataKeys: Object.keys(payment.metadata || {}),
          hasShipping: payment.metadata?.hasShipping,
          shippingCost: payment.metadata?.shippingCost,
          hasShippingData: !!payment.metadata?.shippingData,
          shippingDataKeys: payment.metadata?.shippingData ? Object.keys(payment.metadata.shippingData) : []
        });

        // INTENTAR RECUPERAR DATOS DE ENVÍO DEL CACHÉ
        let shippingDataFromCache: any = null;
        const preferenceId = payment.providerPaymentId;
        
        console.log(`🔍 [CACHE] Buscando datos de envío en caché con key: ${preferenceId}`);
        console.log(`🔍 [CACHE] Total items en caché: ${this.shippingDataCache.size}`);
        
        if (this.shippingDataCache.has(preferenceId)) {
          shippingDataFromCache = this.shippingDataCache.get(preferenceId);
          console.log(`✅ [CACHE] Datos de envío recuperados del caché:`, {
            hasShippingData: !!shippingDataFromCache?.shippingData,
            hasSimpleShipping: !!shippingDataFromCache?.simpleShipping,
            shippingCost: shippingDataFromCache?.shippingCost,
            timestamp: shippingDataFromCache?.timestamp
          });
          
          // Limpiar del caché después de usar
          this.shippingDataCache.delete(preferenceId);
          console.log(`🗑️ [CACHE] Datos de envío eliminados del caché después de usar`);
        } else {
          console.log(`❌ [CACHE] No se encontraron datos de envío en caché`);
        }

        // Usar datos del caché si existen, si no usar los del metadata
        const finalShippingData = shippingDataFromCache?.shippingData || payment.metadata?.shippingData;
        const finalSimpleShipping = shippingDataFromCache?.simpleShipping || payment.metadata?.simpleShipping;
        const finalShippingOption = shippingDataFromCache?.shippingOption || payment.metadata?.shippingOption;
        const finalShippingAddress = shippingDataFromCache?.shippingAddress || payment.metadata?.shippingAddress;
        const finalShippingContact = shippingDataFromCache?.shippingContact || payment.metadata?.shippingContact;
        const finalShippingCost = shippingDataFromCache?.shippingCost || payment.metadata?.shippingCost || 0;

        console.log(`🔍 [WEBHOOK] ===== DATOS DE ENVÍO PARA CREAR ORDEN =====`);
        console.log(`🔍 [WEBHOOK] Fuente: ${shippingDataFromCache ? 'CACHE' : 'METADATA'}`);
        console.log(`🔍 [WEBHOOK] Tipo de envío:`);
        console.log(`🔍 [WEBHOOK] - DrEnvío (shippingData):`, !!finalShippingData);
        console.log(`🔍 [WEBHOOK] - Dirección simple (simpleShipping):`, !!finalSimpleShipping);
        console.log(`🔍 [WEBHOOK] - Transportista (shippingOption):`, !!finalShippingOption);
        console.log(`🔍 [WEBHOOK] - Costo de envío: $${finalShippingCost}`);
        
        if (finalShippingData) {
          console.log(`🔍 [WEBHOOK] ✅ USANDO: DrEnvío - ${finalShippingData.shipment?.carrier} ${finalShippingData.shipment?.service}`);
        } else if (finalShippingOption) {
          console.log(`🔍 [WEBHOOK] ✅ USANDO: Transportista - ${finalShippingOption.carrier} ${finalShippingOption.service}`);
        } else if (finalSimpleShipping) {
          console.log(`🔍 [WEBHOOK] ✅ USANDO: Solo Dirección - ${finalSimpleShipping.address.city}`);
        } else {
          console.log(`🔍 [WEBHOOK] ❌ SIN DATOS DE ENVÍO`);
        }

        let customerEmail: string | undefined;
        let customerName: string | undefined;
        
        // Primero intentar desde shippingContact/simpleShipping
        if (finalShippingContact?.email) {
          customerEmail = finalShippingContact.email;
          customerName = `${finalShippingContact.firstName || ''} ${finalShippingContact.lastName || ''}`.trim();
        } else if (finalSimpleShipping?.contact?.emailOrPhone) {
          customerEmail = finalSimpleShipping.contact.emailOrPhone;
          customerName = `${finalSimpleShipping.contact.firstName || ''} ${finalSimpleShipping.contact.lastName || ''}`.trim();
        }
        
        // Si no hay email aún, intentar desde getUserInfo
        if (!customerEmail) {
          try {
            const userInfo = await this.getUserInfo(payment.userId.toString());
            customerEmail = userInfo.email;
            customerName = customerName || `${userInfo.firstName} ${userInfo.lastName}`;
          } catch (error) {
            console.log(`⚠️ [WEBHOOK] No se pudo obtener email del usuario ${payment.userId}`);
          }
        }

        // Crear orden + limpiar carrito con manejo robusto de errores
        let orderCreated = false;
        try {
          this.logger.log(`Starting order creation + cart cleanup for user ${payment.userId}`);
          console.log(`📧 [WEBHOOK] Creando orden con email: ${customerEmail}, nombre: ${customerName}`);

          const order = await this.ordersService.createOrderFromPayment({
            userId: payment.userId.toString(),
            paymentId: (payment as any)._id.toString(),
            items: payment.items.map((it) => ({ 
              name: it.name, 
              quantity: it.quantity, 
              price: it.price,
              productId: it.productId,
              size: it.size 
            })),
            totalAmount: payment.amount,
            currency: payment.currency,
            customerEmail: customerEmail || undefined,
            customerName: customerName || undefined,
            shippingData: finalShippingData || null,
            simpleShipping: finalSimpleShipping || null,
            shippingOption: finalShippingOption || null,
            shippingCost: finalShippingCost,
          });

          orderCreated = true;

          // Manejar carrito según tipo de pago
          if (payment.metadata?.isPartial) {
            console.log(`🛒 [WEBHOOK] Procesando pago parcial, actualizando carrito...`);
            await this.handlePartialCartUpdate(payment);
          } else {
            console.log(`🛒 [WEBHOOK] Procesando pago completo, limpiando carrito para usuario: ${payment.userId}`);
            await this.cartService.clearCart(payment.userId.toString());
            console.log(`✅ [WEBHOOK] Carrito limpiado exitosamente para usuario: ${payment.userId}`);
          }

          this.logger.log(`✅ Order creation + cart cleanup completed successfully`);

          // Enviar email de confirmación
          if (customerEmail && customerName) {
            console.log(`📧 [WEBHOOK] Enviando email de confirmación a: ${customerEmail}`);
            try {
              await this.ordersService['orderNotificationService'].sendOrderConfirmationEmail(
                order, 
                customerEmail, 
                customerName
              );
              console.log(`✅ [WEBHOOK] Email de confirmación enviado exitosamente`);
            } catch (emailError) {
              console.log(`❌ [WEBHOOK] Error enviando email (no afecta la orden):`, emailError);
              this.logger.error(`Failed to send order confirmation email:`, emailError);
            }
          }

        } catch (error) {
          this.logger.error(`❌ Order creation + cart cleanup failed:`, error);
          console.error('❌ [MERCADOPAGO-WEBHOOK] Error creando orden:', error);
          
          await this.paymentModel.updateOne(
            { _id: (payment as any)._id },
            { 
              $set: { 
                status: PaymentStatus.PENDING,
                // Limpiar captureId para permitir reintento
                captureId: undefined
              } 
            }
          );
          
          try {
            if (payment.metadata?.stockItems) {
              console.log(`🔄 [WEBHOOK-ROLLBACK] Liberando stock reservado...`);
              for (const item of payment.metadata.stockItems) {
                await this.productsService.releaseStock(item.productId, item.quantity);
              }
              console.log(`✅ [WEBHOOK-ROLLBACK] Stock liberado exitosamente`);
            }
          } catch (stockError) {
            console.error(`❌ [WEBHOOK-ROLLBACK] Error liberando stock:`, stockError);
            this.logger.error(`Failed to release stock during rollback:`, stockError);
          }
          
          if (!payment.metadata?.isPartial && orderCreated === false) {
            try {
              console.log(`🔄 [WEBHOOK-ROLLBACK] Restaurando carrito del usuario...`);
              // El carrito ya no se limpia si hay error en la creación de la orden
              console.log(`✅ [WEBHOOK-ROLLBACK] Carrito mantenido (no se limpió debido al error)`);
            } catch (cartError) {
              console.error(`❌ [WEBHOOK-ROLLBACK] Error restaurando carrito:`, cartError);
            }
          }
        }
      } else if (status === 'rejected' || status === 'cancelled' || status === 'cancelled_by_user') {
        payment.status = PaymentStatus.CANCELLED;
        payment.errorMessage = `MP status: ${status}`;
        await payment.save();
        
        // LIBERAR STOCK RESERVADO cuando el pago falla
        try {
          console.log(`🔄 [WEBHOOK] Liberando stock reservado para pago cancelado: ${payment._id}`);
          for (const item of payment.items) {
            if (item.productId && item.size) {
              await this.productsService.releaseStock(item.productId, item.quantity, item.size);
              console.log(`✅ [WEBHOOK] Stock liberado: ${item.productId} - Talle ${item.size} - Cantidad ${item.quantity}`);
            }
          }
          console.log(`✅ [WEBHOOK] Stock liberado exitosamente para pago cancelado`);
        } catch (stockError) {
          console.error(`❌ [WEBHOOK] Error liberando stock:`, stockError);
          this.logger.error(`Failed to release stock for cancelled payment:`, stockError);
        }
      } else if (status === 'in_process' || status === 'pending') {
        payment.status = PaymentStatus.PENDING;
        await payment.save();
      }
    }

    return { ok: true };
  }

  async getUserPayments(userId: string, limit: number = 10, offset: number = 0): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  async findByMercadoPagoPreference(preferenceId: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ providerPaymentId: preferenceId }).exec();
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



  // ========================================
  // CRON JOB: Liberación automática de reservas expiradas
  // ========================================

  /**
   * Cron job que se ejecuta cada 5 minutos para liberar reservas expiradas
   * Busca pagos pendientes que hayan superado su tiempo de reserva
   */
  @Cron('*/5 * * * *') // Cada 5 minutos
  async releaseExpiredReservations(): Promise<void> {
    try {
      this.logger.log('🕐 [CRON] Iniciando verificación de reservas expiradas...');
      
      // Buscar pagos pendientes que hayan expirado
      const expiredPayments = await this.paymentModel.find({
        status: PaymentStatus.PENDING,
        reservedAt: { 
          $lt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutos atrás
        }
      }).exec();

      if (expiredPayments.length === 0) {
        this.logger.log('✅ [CRON] No hay reservas expiradas');
        return;
      }

      this.logger.log(`🔄 [CRON] Encontradas ${expiredPayments.length} reservas expiradas`);

      let releasedCount = 0;
      let errorCount = 0;

      for (const payment of expiredPayments) {
        try {
          await this.releaseExpiredPaymentStock(payment);
          releasedCount++;
          this.logger.log(`✅ [CRON] Reserva liberada para pago ${payment._id}`);
        } catch (error) {
          errorCount++;
          this.logger.error(`❌ [CRON] Error liberando reserva ${payment._id}:`, error);
        }
      }

      this.logger.log(`🏁 [CRON] Proceso completado: ${releasedCount} liberadas, ${errorCount} errores`);
      
    } catch (error) {
      this.logger.error('❌ [CRON] Error crítico en liberación de reservas:', error);
    }
  }

  /**
   * Libera el stock reservado de un pago expirado
   */
  private async releaseExpiredPaymentStock(payment: PaymentDocument): Promise<void> {
    try {
      // Liberar stock de cada item del pago
      for (const item of payment.items) {
        if (item.productId && item.size) {
          await this.productsService.releaseStock(
            item.productId, 
            item.quantity, 
            item.size
          );
          
          this.logger.log(
            `🔄 [CRON] Stock liberado: Producto ${item.productId} - ` +
            `Talle ${item.size} - Cantidad ${item.quantity}`
          );
        }
      }

      // Marcar el pago como expirado
      payment.status = PaymentStatus.EXPIRED;
      payment.errorMessage = 'Reserva expirada por timeout (30 minutos)';
      await payment.save();

      this.logger.log(`✅ [CRON] Pago ${payment._id} marcado como expirado`);
      
    } catch (error) {
      this.logger.error(`❌ [CRON] Error liberando stock del pago ${payment._id}:`, error);
      throw error;
    }
  }

  /**
   * Método manual para liberar reservas expiradas (para testing o uso administrativo)
   */
  async manuallyReleaseExpiredReservations(): Promise<{ 
    released: number; 
    errors: number; 
    details: string[] 
  }> {
    this.logger.log('🔧 [MANUAL] Liberación manual de reservas expiradas...');
    
    const result = {
      released: 0,
      errors: 0,
      details: [] as string[]
    };

    try {
      const expiredPayments = await this.paymentModel.find({
        status: PaymentStatus.PENDING,
        reservedAt: { 
          $lt: new Date(Date.now() - 30 * 60 * 1000)
        }
      }).exec();

      for (const payment of expiredPayments) {
        try {
          await this.releaseExpiredPaymentStock(payment);
          result.released++;
          result.details.push(`✅ Pago ${payment._id} liberado exitosamente`);
        } catch (error) {
          result.errors++;
          result.details.push(`❌ Error en pago ${payment._id}: ${error.message}`);
        }
      }

      this.logger.log(`🏁 [MANUAL] Proceso completado: ${result.released} liberadas, ${result.errors} errores`);
      return result;
      
    } catch (error) {
      this.logger.error('❌ [MANUAL] Error crítico:', error);
      throw error;
    }
  }

}
