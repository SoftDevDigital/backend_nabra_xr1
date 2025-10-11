export const paypalConfig = {
  clientId: 'ASLRgRIUQBs1Z8q7eJgWEhAUGq7rbFOjy4Mh19cBMkO3IROJ2hEKwwwMNF2whP5A56W4nBUe3-pRe85w',
  clientSecret: 'EJKFA2Q0ge6sDZNjzRpvKOZdZdGHLnsc8GjFkLGQbxY-DxJAyQYMtqOlkGxl9Xt3wUVOU5NWe_LXmkbv',
  environment: 'sandbox', // 'sandbox' or 'production'
  baseUrl: 'https://api.nabra.mx',
};

export const paymentConfig = {
  defaultCurrency: 'MXN',
  allowedCurrencies: ['USD', 'EUR', 'MXN'],
  webhookSecret: process.env.PAYPAL_WEBHOOK_SECRET,
};



