# 🚚 Integración DrEnvío - Sistema Completo de Envíos

## 📋 Descripción General

Sistema completo de integración con DrEnvío para gestión profesional de envíos, tracking en tiempo real, cálculo de tarifas y validación de direcciones. Diseñado para e-commerce con todas las características de una plataforma profesional como MercadoLibre.

---

## 🏗️ Arquitectura del Sistema

### 📊 **Componentes Principales**

1. **DrEnvioService** - Comunicación directa con API de DrEnvío
2. **ShippingCalculatorService** - Cálculo inteligente de costos y opciones
3. **TrackingService** - Sistema de seguimiento en tiempo real
4. **ShipmentService** - Gestión completa de envíos
5. **ShippingController** - Endpoints REST para frontend

### 🗄️ **Esquemas de Base de Datos**

#### **Shipment Schema**
- Información completa del envío
- Direcciones de origen y destino
- Dimensiones y peso del paquete
- Historial de tracking completo
- Integración con órdenes y usuarios
- Datos específicos de DrEnvío

---

## 🔗 **Endpoints de la API**

### 📦 **CÁLCULO DE ENVÍOS**

#### `POST /shipping/calculate`
Calcular opciones de envío personalizadas
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/shipping/calculate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addressId": "ADDRESS_ID",
    "cartItems": [
      {"productId": "PRODUCT_ID", "quantity": 2}
    ]
  }'
```

#### `POST /shipping/calculate/cart`
Calcular envío desde carrito actual
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/shipping/calculate/cart?addressId=ADDRESS_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `GET /shipping/zones/:postalCode`
Obtener información de zona por código postal
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/zones/1043" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 📍 **TRACKING Y SEGUIMIENTO**

#### `GET /shipping/track/:trackingNumber` (Público)
Rastrear envío por número de seguimiento
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/track/DR123456789AR"
```

#### `GET /shipping/track/order/:orderId`
Rastrear envío por ID de orden
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/track/order/ORDER_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `GET /shipping/my-shipments`
Obtener todos los envíos del usuario
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/my-shipments?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 🏠 **VALIDACIÓN DE DIRECCIONES**

#### `POST /shipping/validate-address`
Validar dirección con DrEnvío
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/shipping/validate-address" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "postalCode": "1043",
    "country": "Argentina"
  }'
```

### 📋 **INFORMACIÓN DE SERVICIOS**

#### `GET /shipping/services`
Obtener servicios de envío disponibles
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/services?zone=CABA" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `GET /shipping/coverage`
Obtener información de cobertura
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/coverage" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `GET /shipping/delivery-estimate`
Obtener estimación de entrega
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/delivery-estimate?service=express&zone=CABA" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 **Configuración y Variables de Entorno**

### 📝 **Variables Requeridas**
```env
# DrEnvío API
DRENVIO_API_URL=https://api.drenvio.com.ar/v1
DRENVIO_API_KEY=your_api_key_here
DRENVIO_SECRET_KEY=your_secret_key_here
DRENVIO_ENVIRONMENT=sandbox

# Empresa
COMPANY_CUIT=20-12345678-9

# Webhooks
APP_BASE_URL=https://9dbdcf7272a6.ngrok-free.app
DRENVIO_WEBHOOK_SECRET=your_webhook_secret
```

### ⚙️ **Configuración de Servicios**

```typescript
// Servicios disponibles
{
  standard: {
    name: 'Envío Estándar',
    description: 'Entrega en 3-5 días hábiles',
    maxWeight: 30, // kg
    zones: ['CABA', 'GBA', 'INTERIOR']
  },
  express: {
    name: 'Envío Express', 
    description: 'Entrega en 24-48 horas',
    maxWeight: 20, // kg
    zones: ['CABA', 'GBA', 'INTERIOR']
  },
  same_day: {
    name: 'Envío Mismo Día',
    description: 'Entrega el mismo día',
    maxWeight: 10, // kg
    zones: ['CABA'] // Solo CABA
  }
}
```

---

## 🎯 **Características Implementadas**

### 💰 **Sistema de Tarifas Inteligente**
- ✅ Cálculo automático por zona (CABA, GBA, Interior)
- ✅ Envío gratis por monto mínimo
- ✅ Multiplicadores por peso
- ✅ Descuentos y promociones
- ✅ Fallback cuando DrEnvío no está disponible

### 📦 **Gestión de Paquetes**
- ✅ Cálculo automático de dimensiones
- ✅ Estimación de peso por categoría de producto
- ✅ Optimización de empaque
- ✅ Validación de límites de peso y tamaño
- ✅ Soporte para productos frágiles

### 🔍 **Tracking Avanzado**
- ✅ Actualización automática cada hora (CRON)
- ✅ Historial completo de eventos
- ✅ Notificaciones automáticas
- ✅ Cálculo de progreso visual
- ✅ Detección de entregas fallidas

### 🏠 **Validación de Direcciones**
- ✅ Integración con API de DrEnvío
- ✅ Normalización de direcciones
- ✅ Sugerencias de corrección
- ✅ Validación de zonas de cobertura
- ✅ Coordenadas GPS opcionales

### 🔔 **Sistema de Webhooks**
- ✅ Actualización automática de estados
- ✅ Notificaciones de entrega
- ✅ Manejo de excepciones
- ✅ Validación de signatures

---

## 🚀 **Flujos de Uso Completos**

### 1. **Flujo de Cálculo de Envío**
```bash
# 1. Obtener opciones de envío desde carrito
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/shipping/calculate/cart" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Respuesta esperada:
{
  "success": true,
  "options": [
    {
      "serviceId": "standard",
      "serviceName": "Envío Estándar",
      "cost": 1500,
      "originalCost": 1500,
      "estimatedDays": 2,
      "estimatedDeliveryDate": "2025-09-23",
      "zone": "CABA",
      "isFree": false,
      "features": ["Seguimiento incluido", "Entrega en domicilio"]
    }
  ],
  "destination": {
    "address": "Av. Corrientes 1234, San Nicolás, Buenos Aires, CABA 1043",
    "zone": "CABA",
    "postalCode": "1043"
  },
  "packageInfo": {
    "totalWeight": 1.6,
    "totalValue": 1399.98,
    "dimensions": { "length": 30, "width": 25, "height": 20 },
    "itemCount": 2
  }
}
```

### 2. **Flujo de Creación de Envío**
```bash
# 1. Crear envío desde orden (esto se hace automáticamente al completar pago)
# El sistema crea el envío en DrEnvío y retorna información completa

# 2. Obtener tracking de la orden
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/track/order/ORDER_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. **Flujo de Tracking Público**
```bash
# 1. Tracking público (sin autenticación)
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/track/DR123456789AR"

# Respuesta esperada:
{
  "trackingNumber": "DR123456789AR",
  "status": "in_transit",
  "statusDescription": "En tránsito hacia el destino",
  "estimatedDeliveryDate": "2025-09-23",
  "currentLocation": "Centro de distribución Buenos Aires",
  "progress": 60,
  "events": [
    {
      "timestamp": "2025-09-21T10:30:00Z",
      "status": "created",
      "description": "Envío creado exitosamente",
      "location": "Centro de distribución"
    }
  ],
  "shipmentInfo": {
    "service": "Envío Estándar",
    "origin": "Buenos Aires, CABA",
    "destination": "Buenos Aires, CABA",
    "carrier": "DrEnvío"
  },
  "canBeCancelled": false,
  "canBeRescheduled": false
}
```

### 4. **Flujo de Validación de Direcciones**
```bash
# 1. Validar dirección antes de crear envío
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/shipping/validate-address" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires", 
    "state": "CABA",
    "postalCode": "1043",
    "country": "Argentina"
  }'

# 2. Validar dirección específica del perfil
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/addresses/ADDRESS_ID/drenvio-validation" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 **Características Profesionales**

### 🎯 **Cálculo Inteligente de Costos**
- **Por Zona**: CABA (más barato), GBA (intermedio), Interior (más caro)
- **Por Peso**: Multiplicadores automáticos cada 5kg
- **Por Servicio**: Estándar, Express, Mismo Día
- **Envío Gratis**: Automático por montos mínimos configurables

### 🔄 **Sistema de Fallback**
- **API Offline**: Cálculos locales cuando DrEnvío no responde
- **Cotizaciones Backup**: Tarifas predefinidas por zona
- **Retry Logic**: Reintentos automáticos con backoff

### 📱 **Tracking en Tiempo Real**
- **Actualización Automática**: CRON job cada hora
- **Estados Detallados**: 9 estados diferentes del envío
- **Progreso Visual**: Porcentaje de completado
- **Notificaciones**: Email, SMS, Push (preparado)

### 🛡️ **Validaciones y Seguridad**
- **Límites de Peso**: Máximo 50kg por paquete
- **Límites de Valor**: Máximo $500,000 ARS
- **Validación de Dimensiones**: Límites configurables
- **Webhook Security**: Validación de signatures

### 🎁 **Promociones y Descuentos**
- **Envío Gratis Automático**: Por monto mínimo
- **Descuentos por Zona**: Configurables por región
- **Promociones Especiales**: Sistema extensible

---

## 🔧 **Configuración por Zonas**

### 🏙️ **CABA (1000-1499)**
- **Tarifa Base**: $1,500
- **Envío Gratis**: Compras > $15,000
- **Servicios**: Estándar (1-2 días), Express (1 día), Mismo Día
- **Estimado**: 1-2 días hábiles

### 🏘️ **GBA (1600-1900)**
- **Tarifa Base**: $2,500
- **Envío Gratis**: Compras > $20,000
- **Servicios**: Estándar (2-3 días), Express (2 días)
- **Estimado**: 2-3 días hábiles

### 🌍 **Interior (Resto del País)**
- **Tarifa Base**: $3,500
- **Envío Gratis**: Compras > $25,000
- **Servicios**: Estándar (3-7 días), Express (3 días)
- **Estimado**: 3-7 días hábiles

---

## 🔄 **Estados de Envío**

| Estado | Descripción | Progreso | Acciones |
|--------|-------------|----------|----------|
| `pending` | Envío pendiente de creación | 0% | Cancelar |
| `created` | Envío creado, esperando recolección | 20% | Cancelar |
| `in_transit` | En tránsito hacia el destino | 60% | Rastrear |
| `out_for_delivery` | En reparto, será entregado hoy | 90% | Reprogramar |
| `delivered` | Entregado exitosamente | 100% | - |
| `failed_delivery` | Intento de entrega fallido | 85% | Reprogramar |
| `returned` | Devuelto al origen | 100% | - |
| `cancelled` | Envío cancelado | 0% | - |
| `exception` | Excepción en el envío | 50% | Contactar |

---

## 🎯 **Características Avanzadas**

### 🤖 **Automatización**
- **Creación Automática**: Envíos se crean al completar pago
- **Actualización de Stock**: Descuento automático al enviar
- **Tracking Updates**: CRON job cada hora
- **Notificaciones**: Automáticas por cambios de estado

### 📊 **Analytics y Reportes**
- **Estadísticas de Envío**: Por período, estado, zona
- **Performance de Entrega**: Métricas de puntualidad
- **Costos por Zona**: Análisis de rentabilidad
- **Trending de Problemas**: Identificación de patrones

### 🔔 **Sistema de Notificaciones**
- **Email**: Confirmación, tracking, entrega
- **SMS**: Notificaciones críticas
- **Push**: Actualizaciones en tiempo real
- **Webhooks**: Para sistemas externos

### 🛠️ **Herramientas Administrativas**
- **Dashboard de Envíos**: Vista completa de operaciones
- **Gestión de Excepciones**: Manejo de problemas
- **Reportes Automáticos**: Estadísticas periódicas
- **Configuración Dinámica**: Ajustes sin redeploy

---

## 🚀 **Endpoints Administrativos**

### 📊 **Estadísticas** (Solo Admins)
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/admin/statistics?dateFrom=2025-09-01&dateTo=2025-09-30" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### 📈 **Performance de Entregas**
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/admin/performance?dateFrom=2025-09-01" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### 🔄 **Forzar Actualización de Tracking**
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/shipping/admin/update-tracking" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 🔗 **Webhooks de DrEnvío**

### 📍 **Endpoints de Webhooks** (Públicos)

#### `POST /shipping/webhooks/status-update`
Actualización de estado desde DrEnvío
```bash
# Llamado automáticamente por DrEnvío
POST https://9dbdcf7272a6.ngrok-free.app/shipping/webhooks/status-update
```

#### `POST /shipping/webhooks/delivered`
Notificación de entrega
```bash
# Llamado automáticamente por DrEnvío
POST https://9dbdcf7272a6.ngrok-free.app/shipping/webhooks/delivered
```

#### `POST /shipping/webhooks/exception`
Notificación de excepciones
```bash
# Llamado automáticamente por DrEnvío
POST https://9dbdcf7272a6.ngrok-free.app/shipping/webhooks/exception
```

---

## 🔧 **Integración con Sistema Existente**

### 🛒 **Con Carrito de Compras**
- **Cálculo Automático**: Costos de envío en tiempo real
- **Validación Previa**: Verificar direcciones antes del checkout
- **Opciones Múltiples**: Diferentes servicios de envío

### 💳 **Con Sistema de Pagos**
- **Creación Automática**: Envío se crea al completar pago
- **Costos Incluidos**: Shipping cost en el total del pago
- **Rollback**: Cancelación automática si falla el pago

### 📦 **Con Órdenes**
- **Linking Automático**: Cada orden tiene su envío
- **Estado Sincronizado**: Estado de orden se actualiza con envío
- **Historial Completo**: Tracking visible en orden

### 👤 **Con Perfil de Usuario**
- **Direcciones Múltiples**: Selección de dirección de envío
- **Información Completa**: Datos del receptor
- **Preferencias**: Configuraciones de entrega

---

## 📋 **Testing Completo**

### 🧪 **Flujo de Testing Recomendado**

```bash
# 1. Configurar perfil con dirección
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/profile/addresses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "home",
    "alias": "Casa",
    "street": "Av. Corrientes 1234",
    "neighborhood": "San Nicolás", 
    "city": "Buenos Aires",
    "state": "CABA",
    "postalCode": "1043",
    "country": "Argentina",
    "isDefault": true
  }'

# 2. Agregar productos al carrito
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/cart/add" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 2,
    "size": "M"
  }'

# 3. Calcular opciones de envío
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/shipping/calculate/cart" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Proceder con el pago (incluye shipping)
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/payments/from-cart" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Verificar creación de envío
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/my-shipments" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 6. Rastrear envío
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/shipping/track/TRACKING_NUMBER"
```

---

## ✅ **Sistema Completo Implementado**

El sistema DrEnvío está **100% funcional** e incluye:

- ✅ **Integración API Completa** con DrEnvío
- ✅ **Cálculo Inteligente** de costos y opciones
- ✅ **Tracking en Tiempo Real** con CRON jobs
- ✅ **Validación de Direcciones** automática
- ✅ **Sistema de Webhooks** para actualizaciones
- ✅ **Gestión de Excepciones** robusta
- ✅ **Analytics y Reportes** para administradores
- ✅ **Integración Total** con carrito, pagos y órdenes
- ✅ **Fallback Systems** para alta disponibilidad
- ✅ **Configuración Flexible** por zonas y servicios

**¡El sistema está listo para producción con DrEnvío!** 🚀
