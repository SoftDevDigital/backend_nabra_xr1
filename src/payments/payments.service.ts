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
import { CartService } from '../cart/cart.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private paypalService: PayPalService,
    @Inject(forwardRef(() => CartService)) private cartService: CartService,
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
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('Payment cannot be captured');
      }

      // Capturar el pago en PayPal
      const paypalResponse = await this.paypalService.capturePayment(
        payment.providerPaymentId,
        payerId,
      );

      // Actualizar el estado del pago
      payment.status = PaymentStatus.COMPLETED;
      payment.captureId = paypalResponse.id;
      payment.payerId = payerId;
      await payment.save();

      this.logger.log(`Payment captured: ${paymentId}`);

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
      // Obtener el carrito del usuario
      const cart = await this.cartService.getCart(userId);
      
      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

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

      return await this.createPayment(userId, createPaymentDto);
    } catch (error) {
      this.logger.error('Error creating payment from cart:', error);
      throw new BadRequestException(`Failed to create payment from cart: ${error.message}`);
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
}
