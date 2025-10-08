export const drenvioConfig = {
  // Configuración de API
  apiUrl: process.env.DRENVIO_API_URL || 'https://prod.api-drenvio.com',
  apiKey: process.env.DRENVIO_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYXV0aDB8NjMzZjk3NWM1MDMzYmZhY2E5YjZhNzJkIiwibmFtZSI6ImJlcmVuaWNlIG5hcmNpem8iLCJlbWFpbCI6Im5hYnJhd29tYW5zbXhAZ21haWwuY29tIiwiaWF0IjoxNzU4NjU1MTcxfQ.qUUCFXx5Cd-u56SEpGvmv9ZY0EipO0C7HdU4UjdSAoA',
  secretKey: process.env.DRENVIO_SECRET_KEY || '',
  environment: process.env.DRENVIO_ENVIRONMENT || 'production', // 'sandbox' o 'production'
  
  // Configuración de empresa
  companyInfo: {
    name: 'Nabra',
    rfc: process.env.COMPANY_RFC || 'NABX123456XXX',
    address: {
      street: 'Callejón 6 de Mayo 150',
      city: 'Tlajomulco de Zúñiga',
      state: 'JAL',
      postalCode: '45646',
      country: 'México',
    },
    contact: {
      phone: '+52 55 1234-5678',
      email: 'contact@nabraxr.com',
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
      description: 'Entrega el mismo día (solo ZMG)',
      maxWeight: 10, // kg
      maxDimensions: { length: 50, width: 50, height: 50 }, // cm
      availableZones: ['GDL'],
    },
  },

  // Configuración de zonas
  deliveryZones: {
    jalisco: {
      id: 'JAL',
      name: 'Jalisco',
      baseRate: 120,
      freeShippingThreshold: 1200,
      estimatedDelivery: '1-2 días hábiles',
    },
    gdl: {
      id: 'GDL',
      name: 'Zona Metropolitana de Guadalajara',
      baseRate: 150,
      freeShippingThreshold: 1500,
      estimatedDelivery: '1-2 días hábiles',
    },
    interior: {
      id: 'INTERIOR',
      name: 'Interior de la República',
      baseRate: 300,
      freeShippingThreshold: 2000,
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
    maxPackageValue: 50000, // MXN
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
