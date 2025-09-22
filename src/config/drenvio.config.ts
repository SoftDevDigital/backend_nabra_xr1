export const drenvioConfig = {
  // Configuración de API
  apiUrl: process.env.DRENVIO_API_URL || 'https://api.drenvio.com.ar/v1',
  apiKey: process.env.DRENVIO_API_KEY || '',
  secretKey: process.env.DRENVIO_SECRET_KEY || '',
  environment: process.env.DRENVIO_ENVIRONMENT || 'sandbox', // 'sandbox' o 'production'
  
  // Configuración de empresa
  companyInfo: {
    name: 'Nabra XR',
    cuit: process.env.COMPANY_CUIT || '20-12345678-9',
    address: {
      street: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      state: 'CABA',
      postalCode: '1043',
      country: 'Argentina',
    },
    contact: {
      phone: '+54 11 1234-5678',
      email: 'envios@nabraxr.com',
    },
  },

  // Configuración de servicios
  services: {
    standardDelivery: {
      id: 'standard',
      name: 'Envío Estándar',
      description: 'Entrega en 3-5 días hábiles',
      maxWeight: 30, // kg
      maxDimensions: { length: 100, width: 100, height: 100 }, // cm
    },
    expressDelivery: {
      id: 'express',
      name: 'Envío Express',
      description: 'Entrega en 24-48 horas',
      maxWeight: 20, // kg
      maxDimensions: { length: 80, width: 80, height: 80 }, // cm
    },
    sameDay: {
      id: 'same_day',
      name: 'Envío Mismo Día',
      description: 'Entrega el mismo día (solo CABA)',
      maxWeight: 10, // kg
      maxDimensions: { length: 50, width: 50, height: 50 }, // cm
      availableZones: ['CABA'],
    },
  },

  // Configuración de zonas
  deliveryZones: {
    caba: {
      id: 'CABA',
      name: 'Ciudad Autónoma de Buenos Aires',
      baseRate: 1500,
      freeShippingThreshold: 15000,
      estimatedDelivery: '1-2 días hábiles',
    },
    gba: {
      id: 'GBA',
      name: 'Gran Buenos Aires',
      baseRate: 2500,
      freeShippingThreshold: 20000,
      estimatedDelivery: '2-3 días hábiles',
    },
    interior: {
      id: 'INTERIOR',
      name: 'Interior del País',
      baseRate: 3500,
      freeShippingThreshold: 25000,
      estimatedDelivery: '3-7 días hábiles',
    },
  },

  // Configuración de webhooks
  webhooks: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3001',
    endpoints: {
      statusUpdate: '/api/drenvio/webhooks/status-update',
      delivered: '/api/drenvio/webhooks/delivered',
      exception: '/api/drenvio/webhooks/exception',
    },
    secret: process.env.DRENVIO_WEBHOOK_SECRET || 'your_webhook_secret',
  },

  // Límites y configuraciones
  limits: {
    maxPackageWeight: 50, // kg
    maxPackageValue: 500000, // ARS
    maxDimension: 150, // cm
    minDimension: 1, // cm
  },

  // Configuración de seguimiento
  tracking: {
    updateInterval: 3600000, // 1 hora en milisegundos
    maxRetries: 3,
    retryDelay: 5000, // 5 segundos
  },
};
