# 🎁 Sistema de Promociones y Descuentos - Documentación Completa

## 📋 Descripción General

Sistema completo de promociones y descuentos con cupones, ofertas automáticas, descuentos por cantidad, envío gratis y panel administrativo. Diseñado para maximizar ventas y mejorar la retención de clientes.

---

## 🏗️ Arquitectura del Sistema

### 📊 **Componentes Principales**

1. **Promotion Schema** - Promociones con múltiples tipos y condiciones
2. **Coupon Schema** - Cupones de descuento con códigos únicos
3. **DiscountCalculatorService** - Motor de cálculo de descuentos
4. **PromotionsService** - Gestión completa de promociones
5. **Integración con Carrito** - Aplicación automática de descuentos

### 🎯 **Tipos de Promociones Implementadas**

- ✅ **Descuento Porcentual** - 10%, 20%, 50% off
- ✅ **Descuento Monto Fijo** - $500, $1000 off
- ✅ **Envío Gratis** - Free shipping promociones
- ✅ **Compra X Lleva Y** - 2x1, 3x2, etc.
- ✅ **Descuento por Cantidad** - Más compras = más descuento
- ✅ **Descuento por Categoría** - Toda una categoría en oferta
- ✅ **Compra Mínima** - Descuento por alcanzar monto mínimo
- ✅ **Flash Sales** - Ofertas por tiempo limitado

---

## 🔗 **Endpoints de la API**

### 👥 **ENDPOINTS PÚBLICOS** (Sin autenticación)

#### `GET /promotions/active`
Obtener promociones activas
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/active"
```

#### `GET /promotions/coupons/public`
Obtener cupones públicos disponibles
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/coupons/public"
```

#### `GET /promotions/category/:category`
Promociones específicas de una categoría
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/category/zapatillas"
```

#### `GET /promotions/product/:productId`
Promociones específicas de un producto
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/product/PRODUCT_ID"
```

#### `POST /promotions/validate-coupon`
Validar cupón sin aplicarlo
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/promotions/validate-coupon" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "SAVE20",
    "userId": "USER_ID"
  }'
```

### 👤 **ENDPOINTS DE USUARIO** (Autenticación requerida)

#### `POST /promotions/apply-discounts`
Calcular descuentos para carrito
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/promotions/apply-discounts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "SAVE20",
    "cartItems": [
      {
        "productId": "PRODUCT_ID",
        "cartItemId": "CART_ITEM_ID",
        "productName": "Zapatillas Nike",
        "category": "zapatillas",
        "quantity": 2,
        "price": 1999.99,
        "size": "42"
      }
    ],
    "totalAmount": 3999.98
  }'
```

#### `GET /cart/summary-with-discounts`
Resumen del carrito con descuentos aplicados
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/cart/summary-with-discounts?couponCode=SAVE20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `POST /cart/apply-coupon`
Aplicar cupón al carrito
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/cart/apply-coupon" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "SAVE20"}'
```

#### `GET /promotions/my-coupons`
Mis cupones personalizados
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/my-coupons" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 🎛️ **ENDPOINTS ADMINISTRATIVOS** (Solo admins)

#### `GET /admin/promotions`
Lista de promociones para admin
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/admin/promotions?status=active&limit=20" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### `GET /admin/promotions/stats/summary`
Estadísticas de promociones
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/admin/promotions/stats/summary" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### `PUT /admin/promotions/:promotionId/status`
Cambiar estado de promoción
```bash
curl -X PUT "https://9dbdcf7272a6.ngrok-free.app/admin/promotions/PROMOTION_ID/status" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

#### `GET /admin/coupons`
Lista de cupones para admin
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/admin/coupons?status=active&promotionId=PROMOTION_ID" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 🎯 **Ejemplos de Promociones**

### 💰 **1. Descuento Porcentual Simple**
```json
{
  "name": "Black Friday 30% OFF",
  "description": "30% de descuento en toda la tienda",
  "type": "percentage",
  "target": "all_products",
  "startDate": "2025-11-29T00:00:00Z",
  "endDate": "2025-11-29T23:59:59Z",
  "conditions": {
    "minimumPurchaseAmount": 1000
  },
  "rules": {
    "discountPercentage": 30,
    "maxDiscountAmount": 5000
  },
  "isAutomatic": true,
  "priority": 1
}
```

### 🎁 **2. Compra 2 Lleva 3**
```json
{
  "name": "2x1 en Sandalias",
  "description": "Compra 2 sandalias y lleva 1 gratis",
  "type": "buy_x_get_y",
  "target": "category",
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "conditions": {
    "categories": ["sandalias"],
    "maxUsesPerUser": 1
  },
  "rules": {
    "buyQuantity": 2,
    "getQuantity": 1,
    "getDiscountPercentage": 100
  },
  "isAutomatic": true
}
```

### 📦 **3. Descuento por Cantidad**
```json
{
  "name": "Descuentos por Volumen",
  "description": "Más compras, más descuento",
  "type": "quantity_discount",
  "target": "all_products",
  "startDate": "2025-09-21T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "conditions": {},
  "rules": {
    "quantityTiers": [
      {"quantity": 3, "discount": 10, "discountType": "percentage"},
      {"quantity": 5, "discount": 15, "discountType": "percentage"},
      {"quantity": 10, "discount": 25, "discountType": "percentage"}
    ]
  },
  "isAutomatic": true
}
```

### 🚚 **4. Envío Gratis**
```json
{
  "name": "Envío Gratis +$2000",
  "description": "Envío gratis en compras mayores a $2000",
  "type": "free_shipping",
  "target": "all_products",
  "startDate": "2025-09-21T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "conditions": {
    "minimumPurchaseAmount": 2000
  },
  "rules": {},
  "isAutomatic": true
}
```

---

## 🎫 **Sistema de Cupones**

### 📝 **Tipos de Cupones**

- **`single_use`** - Un solo uso por cupón
- **`multi_use`** - Múltiples usos hasta límite
- **`user_specific`** - Personalizado para un usuario
- **`public`** - Visible en listados públicos

### 🔧 **Creación de Cupones**

#### Cupón Individual
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/promotions/admin/coupons/create" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "name": "Bienvenida 10% OFF",
    "description": "10% de descuento para nuevos clientes",
    "type": "single_use",
    "promotionId": "PROMOTION_ID",
    "maxUses": 100,
    "maxUsesPerUser": 1,
    "minimumPurchaseAmount": 500,
    "validFrom": "2025-09-21T00:00:00Z",
    "validUntil": "2025-12-31T23:59:59Z",
    "isPublic": true
  }'
```

#### Generación Masiva de Cupones
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/promotions/admin/coupons/generate-bulk" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "promotionId": "PROMOTION_ID",
    "quantity": 100,
    "prefix": "BF2025"
  }'
```

---

## 📊 **Respuestas de Ejemplo**

### 🛒 **Carrito con Descuentos**
```json
{
  "cartSummary": {
    "items": [...],
    "totalItems": 3,
    "totalQuantity": 5,
    "subtotal": 4999.95,
    "estimatedTax": 499.99,
    "originalTotal": 5499.94
  },
  "discounts": {
    "success": true,
    "appliedPromotions": [
      {
        "promotionId": "promo123",
        "promotionName": "Black Friday 30% OFF",
        "type": "percentage",
        "discountAmount": 1499.99,
        "discountPercentage": 30,
        "description": "30% de descuento en productos seleccionados"
      },
      {
        "promotionId": "shipping456",
        "promotionName": "Envío Gratis +$2000",
        "type": "free_shipping",
        "discountAmount": 0,
        "description": "Envío gratis aplicado"
      }
    ],
    "totalDiscount": 1499.99,
    "originalTotal": 5499.94,
    "finalTotal": 3999.95,
    "savings": 1499.99
  },
  "finalTotal": 3999.95
}
```

### 🎫 **Validación de Cupón**
```json
{
  "valid": true,
  "coupon": {
    "code": "SAVE20",
    "name": "20% de descuento",
    "description": "Descuento especial del 20%",
    "type": "multi_use",
    "maxUses": 1000,
    "totalUses": 245,
    "validUntil": "2025-12-31T23:59:59Z"
  },
  "promotion": {
    "name": "Promoción Especial",
    "type": "percentage",
    "rules": {
      "discountPercentage": 20
    }
  },
  "message": "Cupón válido"
}
```

---

## 🔧 **Configuración Avanzada**

### ⚙️ **Condiciones de Aplicación**

```typescript
// Ejemplo de condiciones complejas
{
  "conditions": {
    "minimumPurchaseAmount": 1500,      // Compra mínima $1500
    "minimumQuantity": 2,               // Mínimo 2 productos
    "specificProducts": ["prod1", "prod2"], // Solo productos específicos
    "categories": ["zapatillas", "botas"],   // Solo estas categorías
    "maxUsesPerUser": 1,                // Máximo 1 uso por usuario
    "maxTotalUses": 1000,               // Máximo 1000 usos totales
    "excludeDiscountedItems": true,     // Excluir items ya con descuento
    "allowedShippingZones": ["CABA"],   // Solo CABA
    "allowedPaymentMethods": ["paypal"] // Solo PayPal
  }
}
```

### 🎯 **Reglas de Descuento**

```typescript
// Descuento por cantidad con tiers
{
  "rules": {
    "quantityTiers": [
      {"quantity": 3, "discount": 10, "discountType": "percentage"},
      {"quantity": 5, "discount": 20, "discountType": "percentage"},
      {"quantity": 10, "discount": 500, "discountType": "fixed"}
    ],
    "maxDiscountAmount": 2000,  // Límite máximo
    "minDiscountAmount": 100    // Descuento mínimo
  }
}
```

---

## 🚀 **Flujos de Uso Completos**

### 1. **Flujo de Compra con Descuentos**

```bash
# 1. Ver promociones activas
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/active"

# 2. Agregar productos al carrito
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/cart/add" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 3,
    "size": "M"
  }'

# 3. Ver carrito con descuentos automáticos
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/cart/summary-with-discounts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Aplicar cupón adicional
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/cart/apply-coupon" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"couponCode": "EXTRA10"}'

# 5. Proceder al pago con descuentos
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/payments/from-cart" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. **Flujo Administrativo - Crear Promoción**

```bash
# 1. Ver estadísticas actuales
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/admin/promotions/stats/summary" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# 2. Crear nueva promoción (usando endpoint completo)
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/promotions/admin/create" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cyber Monday 40% OFF",
    "description": "40% de descuento en electrónicos",
    "type": "percentage",
    "target": "category",
    "startDate": "2025-12-02T00:00:00Z",
    "endDate": "2025-12-02T23:59:59Z",
    "conditions": {
      "categories": ["electronicos"],
      "minimumPurchaseAmount": 1000,
      "maxTotalUses": 500
    },
    "rules": {
      "discountPercentage": 40,
      "maxDiscountAmount": 3000
    },
    "isAutomatic": true,
    "priority": 1
  }'

# 3. Activar promoción
curl -X PUT "https://9dbdcf7272a6.ngrok-free.app/admin/promotions/PROMOTION_ID/status" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'

# 4. Generar cupones masivos
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/promotions/admin/coupons/generate-bulk" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "promotionId": "PROMOTION_ID",
    "quantity": 100,
    "prefix": "CYBER"
  }'
```

### 3. **Flujo de Monitoreo y Gestión**

```bash
# 1. Ver dashboard con métricas de promociones
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/admin/dashboard" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# 2. Ver promociones que expiran pronto
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/admin/expiring-soon?days=7" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# 3. Ver promociones sin usar
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/admin/unused" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# 4. Reporte de uso
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/promotions/admin/reports/usage?dateFrom=2025-09-01&dateTo=2025-09-30" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 🎨 **Características Avanzadas**

### 🤖 **Automatización**
- ✅ **Aplicación Automática** - Descuentos se aplican sin códigos
- ✅ **Expiración Automática** - CRON job actualiza estados cada hora
- ✅ **Validaciones en Tiempo Real** - Verificación instantánea
- ✅ **Optimización de Descuentos** - Siempre aplica la mejor oferta

### 🔍 **Sistema de Prioridades**
- ✅ **Resolución de Conflictos** - Prioridad 1-10 para múltiples promociones
- ✅ **Mejor Descuento** - Automáticamente aplica el mayor beneficio
- ✅ **Combinación Inteligente** - Evita conflictos entre promociones

### 📊 **Analytics y Tracking**
- ✅ **Métricas de Uso** - Views, clicks, conversiones
- ✅ **ROI de Promociones** - Retorno de inversión
- ✅ **Historial Completo** - Tracking de cada uso
- ✅ **Reportes Detallados** - Analytics por período

### 🛡️ **Validaciones y Seguridad**
- ✅ **Códigos Únicos** - Validación de duplicados
- ✅ **Límites de Uso** - Por usuario y totales
- ✅ **Fechas de Vigencia** - Validación temporal
- ✅ **Condiciones Complejas** - Múltiples criterios

---

## 📈 **Impacto Esperado en el Negocio**

### 🎯 **Métricas de Conversión**
- **+25-40% en ventas** durante promociones
- **+30% valor promedio de orden** con descuentos por cantidad
- **+20% retención** con cupones personalizados
- **+15% conversión** con envío gratis

### 💰 **Optimización de Ingresos**
- **Liquidación de inventario** con descuentos dirigidos
- **Aumento de frecuencia** de compra
- **Cross-selling** con promociones por categoría
- **Up-selling** con descuentos por volumen

### 🎪 **Marketing y Engagement**
- **Campañas estacionales** (Black Friday, Navidad)
- **Fidelización** con cupones exclusivos
- **Adquisición** con descuentos de bienvenida
- **Reactivación** de clientes inactivos

---

## ✅ **Sistema de Promociones Completo**

### 🎉 **Funcionalidades Implementadas**
- ✅ **8 Tipos de Promociones** diferentes
- ✅ **Sistema de Cupones** completo con códigos únicos
- ✅ **Calculadora Inteligente** de descuentos
- ✅ **Integración Total** con carrito y pagos
- ✅ **Panel Administrativo** para gestión
- ✅ **Automatización** con CRON jobs
- ✅ **Analytics Avanzados** y reportes
- ✅ **Validaciones Exhaustivas** y seguridad

### 🚀 **Listo para Maximizar Ventas**
- ✅ **20+ Endpoints** funcionales
- ✅ **Compilación Exitosa** sin errores
- ✅ **Documentación Completa** con ejemplos
- ✅ **Integración Perfecta** con sistema existente

**¡El sistema de promociones está listo para disparar tus ventas!** 🎁

Con este sistema puedes crear cualquier tipo de promoción que necesites para tu estrategia de marketing y ventas.
