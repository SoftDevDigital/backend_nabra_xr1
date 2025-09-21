export const paypalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
};

export const paymentConfig = {
  defaultCurrency: 'USD',
  allowedCurrencies: ['USD', 'EUR', 'MXN'],
  webhookSecret: process.env.PAYPAL_WEBHOOK_SECRET,
};



