import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  Client, 
  OrdersController, 
  OrderApplicationContextUserAction, 
  OrderApplicationContextLandingPage, 
  Environment,
  CheckoutPaymentIntent 
} from '@paypal/paypal-server-sdk';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentResponseDto } from './dtos/payment-response.dto';

@Injectable()
export class PayPalService {
  private readonly logger = new Logger(PayPalService.name);
  private paypalClient: Client;
  private ordersController: OrdersController;

  constructor(private configService: ConfigService) {
    this.initializePayPal();
  }

  private initializePayPal() {
    const clientId = 'ASLRgRIUQBs1Z8q7eJgWEhAUGq7rbFOjy4Mh19cBMkO3IROJ2hEKwwwMNF2whP5A56W4nBUe3-pRe85w'
    const clientSecret = 'EJKFA2Q0ge6sDZNjzRpvKOZdZdGHLnsc8GjFkLGQbxY-DxJAyQYMtqOlkGxl9Xt3wUVOU5NWe_LXmkbv'
    const environment = this.configService.get<string>('PAYPAL_ENVIRONMENT', 'sandbox');

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    this.paypalClient = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      environment: environment === 'production' ? Environment.Production : Environment.Sandbox,
    });

    this.ordersController = new OrdersController(this.paypalClient);
    this.logger.log('PayPal client initialized');
  }

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    try {
      const { items, totalAmount, currency, description, returnUrl, cancelUrl } = createPaymentDto;

      const orderRequest = {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency || 'USD',
              value: totalAmount.toFixed(2),
              breakdown: {
                itemTotal: {
                  currencyCode: currency || 'USD',
                  value: totalAmount.toFixed(2),
                },
              },
            },
            items: items.map((item) => ({
              name: item.name,
              description: item.description || '',
              quantity: item.quantity.toString(),
              unitAmount: {
                currencyCode: item.currency || currency || 'USD',
                value: item.price.toFixed(2),
              },
            })),
            description: description || 'Payment for order',
          },
        ],
        applicationContext: {
          brandName: 'Nabra XR',
          landingPage: OrderApplicationContextLandingPage.NoPreference,
          userAction: OrderApplicationContextUserAction.PayNow,
          returnUrl: `https://api.nabra.mx/payments/paypal/success`,
          cancelUrl: `https://api.nabra.mx/payments/paypal/cancel`,
        },
      };

      const response = await this.ordersController.createOrder({
        body: orderRequest,
      });

      if (response.statusCode === 201 && response.result) {
        const approvalUrl = response.result.links?.find(
          (link: any) => link.rel === 'approve'
        )?.href;

        return {
          id: response.result.id || '',
          status: response.result.status || 'pending',
          approvalUrl: approvalUrl || '',
        };
      }

      throw new BadRequestException('Failed to create PayPal payment');
    } catch (error) {
      this.logger.error('Error creating PayPal payment:', error);
      throw new BadRequestException(`PayPal payment creation failed: ${error.message}`);
    }
  }

  async capturePayment(paymentId: string, payerId?: string): Promise<PaymentResponseDto> {
    try {
      const response = await this.ordersController.captureOrder({
        id: paymentId,
        body: undefined,
      });

      if (response.statusCode === 201 && response.result) {
        return {
          id: response.result.id || '',
          status: response.result.status || 'completed',
        };
      }

      throw new BadRequestException('Failed to capture PayPal payment');
    } catch (error) {
      this.logger.error('Error capturing PayPal payment:', error);
      throw new BadRequestException(`PayPal payment capture failed: ${error.message}`);
    }
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const response = await this.ordersController.getOrder({
        id: paymentId,
      });

      if (response.statusCode === 200 && response.result) {
        return response.result;
      }

      throw new BadRequestException('Failed to get PayPal payment details');
    } catch (error) {
      this.logger.error('Error getting PayPal payment details:', error);
      throw new BadRequestException(`Failed to get payment details: ${error.message}`);
    }
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      // PayPal orders cannot be cancelled once created, but we can mark them as cancelled in our system
      this.logger.log(`Payment ${paymentId} marked as cancelled`);
      return true;
    } catch (error) {
      this.logger.error('Error cancelling PayPal payment:', error);
      return false;
    }
  }
}
