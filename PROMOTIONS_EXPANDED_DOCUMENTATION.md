# 🎁 Sistema de Promociones Expandido - Documentación Completa

## 📋 Descripción General

Sistema completo y avanzado de promociones y descuentos con **20+ tipos diferentes** de promociones, aplicación automática a carritos existentes, notificaciones en tiempo real, y sistema inteligente que aplica descuentos retroactivamente cuando se lanzan nuevas promociones.

---

## 🆕 NUEVOS TIPOS DE PROMOCIONES IMPLEMENTADOS

### **🎯 TIPOS BÁSICOS (ya existían)**
- ✅ **Descuento Porcentual** - 10%, 20%, 50% off
- ✅ **Descuento Monto Fijo** - $500, $1000 off  
- ✅ **Envío Gratis** - Free shipping promociones
- ✅ **2x1 (Buy X Get Y)** - Compra X lleva Y gratis
- ✅ **Descuento por Cantidad** - Más compras = más descuento
- ✅ **Descuento por Categoría** - Toda una categoría en oferta
- ✅ **Compra Mínima** - Descuento por alcanzar monto mínimo
- ✅ **Flash Sales** - Ofertas por tiempo limitado

### **🚀 NUEVOS TIPOS IMPLEMENTADOS**

#### **1. 💰 PAY_X_GET_Y (Pagar X y Llevar Y)**
```json
{
  "type": "pay_x_get_y",
  "rules": {
    "payQuantity": 2,      // Pagas 2
    "getTotalQuantity": 3  // Te llevas 3 (3x2)
  }
}
```
**Ejemplo**: "3x2 en remeras" - Pagas 2 y te llevas 3

#### **2. 🎯 SPECIFIC_PRODUCT_DISCOUNT (Descuento a Producto Específico)**
```json
{
  "type": "specific_product_discount",
  "conditions": {
    "specificProducts": ["product_id_1", "product_id_2"]
  },
  "rules": {
    "discountPercentage": 25
  }
}
```
**Ejemplo**: "25% OFF solo en Zapatillas Nike Air Max"

#### **3. 📈 PROGRESSIVE_QUANTITY_DISCOUNT (Descuentos Progresivos)**
```json
{
  "type": "progressive_quantity_discount",
  "rules": {
    "progressiveTiers": [
      { "position": 1, "discount": 0, "discountType": "percentage" },    // 1er item: precio normal
      { "position": 2, "discount": 50, "discountType": "percentage" },   // 2do item: 50% OFF
      { "position": 3, "discount": 75, "discountType": "percentage" }    // 3er item: 75% OFF
    ]
  }
}
```
**Ejemplo**: "El 2do al 50%, el 3ro al 75%"

#### **4. 📦 BUNDLE_OFFER (Ofertas de Paquetes)**
```json
{
  "type": "bundle_offer",
  "rules": {
    "bundleItems": [
      {
        "productId": "product_1",
        "requiredQuantity": 1,
        "discount": 20,
        "discountType": "percentage"
      },
      {
        "productId": "product_2", 
        "requiredQuantity": 1,
        "discount": 30,
        "discountType": "percentage"
      }
    ]
  }
}
```
**Ejemplo**: "Kit Deportivo: Remera + Short + Medias con descuento especial"

#### **5. ⏰ TIME_BASED_DISCOUNT (Descuentos por Horario)**
```json
{
  "type": "time_based_discount",
  "rules": {
    "timeSlots": [
      {
        "dayOfWeek": 1,        // Lunes
        "startHour": 9,        // 9:00 AM
        "endHour": 12,         // 12:00 PM
        "discount": 15,
        "discountType": "percentage"
      },
      {
        "dayOfWeek": 5,        // Viernes
        "startHour": 18,       // 6:00 PM
        "endHour": 22,         // 10:00 PM
        "discount": 20,
        "discountType": "percentage"
      }
    ]
  }
}
```
**Ejemplo**: "Happy Hour: 15% OFF los lunes de 9-12, 20% OFF los viernes de 18-22"

#### **6. 👑 LOYALTY_DISCOUNT (Descuentos por Fidelidad)**
```json
{
  "type": "loyalty_discount",
  "rules": {
    "loyaltyLevel": "gold",
    "discountPercentage": 15
  }
}
```
**Ejemplo**: "15% OFF para clientes Gold"

#### **7. 🎂 BIRTHDAY_DISCOUNT (Descuentos de Cumpleaños)**
```json
{
  "type": "birthday_discount",
  "rules": {
    "discountPercentage": 25,
    "birthdayDiscountDays": 7  // 7 días antes y después del cumpleaños
  }
}
```
**Ejemplo**: "25% OFF en tu cumpleaños y 7 días antes/después"

#### **8. 🆕 FIRST_PURCHASE_DISCOUNT (Primera Compra)**
```json
{
  "type": "first_purchase_discount",
  "rules": {
    "discountPercentage": 30
  }
}
```
**Ejemplo**: "30% OFF en tu primera compra"

#### **9. 🛒 ABANDONED_CART_DISCOUNT (Carrito Abandonado)**
```json
{
  "type": "abandoned_cart_discount",
  "rules": {
    "discountPercentage": 20
  }
}
```
**Ejemplo**: "20% OFF para recuperar tu carrito abandonado"

#### **10. 🔥 STOCK_CLEARANCE (Liquidación de Stock)**
```json
{
  "type": "stock_clearance",
  "rules": {
    "stockThreshold": 10,      // Cuando quedan 10 o menos
    "urgencyLevel": "high",    // low, medium, high
    "discountPercentage": 40
  }
}
```
**Ejemplo**: "40% OFF - ¡Últimas unidades!"

#### **11. 🌸 SEASONAL_DISCOUNT (Descuentos Estacionales)**
```json
{
  "type": "seasonal_discount",
  "rules": {
    "season": "summer",
    "holiday": "black_friday",
    "discountPercentage": 35
  }
}
```
**Ejemplo**: "35% OFF - Liquidación de Verano" o "Black Friday 35% OFF"

#### **12. 📊 VOLUME_DISCOUNT (Descuento por Volumen)**
```json
{
  "type": "volume_discount",
  "rules": {
    "quantityTiers": [
      { "quantity": 5, "discount": 10, "discountType": "percentage" },
      { "quantity": 10, "discount": 20, "discountType": "percentage" },
      { "quantity": 20, "discount": 500, "discountType": "fixed" }
    ]
  }
}
```
**Ejemplo**: "5+ items = 10% OFF, 10+ items = 20% OFF, 20+ items = $500 OFF"

#### **13. 🎁 COMBO_DISCOUNT (Descuentos por Combos)**
```json
{
  "type": "combo_discount",
  "rules": {
    "bundleItems": [
      { "productId": "product_1", "requiredQuantity": 1, "discount": 15, "discountType": "percentage" },
      { "productId": "product_2", "requiredQuantity": 1, "discount": 15, "discountType": "percentage" }
    ]
  }
}
```
**Ejemplo**: "Combo Familiar: 15% OFF en cada producto del combo"

#### **14. 🎁 GIFT_WITH_PURCHASE (Regalo con Compra)**
```json
{
  "type": "gift_with_purchase",
  "rules": {
    "giftItems": [
      {
        "giftProductId": "gift_product_id",
        "giftQuantity": 1,
        "minimumPurchaseAmount": 5000
      }
    ]
  }
}
```
**Ejemplo**: "Regalo gratis con compras +$5000"

---

## 🤖 SISTEMA AUTOMÁTICO DE APLICACIÓN A CARRITO

### **⚡ Características Principales**

#### **1. 🔄 Aplicación Retroactiva**
- **Cuando se activa una promoción**: Se aplica automáticamente a todos los carritos que contengan productos elegibles
- **Sin acción del usuario**: Los descuentos se aplican automáticamente
- **Notificación automática**: Los usuarios son notificados de los nuevos descuentos

#### **2. 📱 Actualización en Tiempo Real**
- **Cambios inmediatos**: Los descuentos se actualizan en tiempo real
- **Sin recarga**: El carrito se actualiza automáticamente
- **Sincronización**: Todos los usuarios ven los cambios instantáneamente

#### **3. 🎯 Aplicación Inteligente**
- **Al agregar productos**: Se evalúan automáticamente las promociones aplicables
- **Validación continua**: Se verifican condiciones y límites
- **Priorización**: Las promociones con mayor prioridad se aplican primero

### **⚙️ Configuración de Promociones**

```json
{
  "autoApplyToCart": true,           // Se aplica automáticamente al carrito
  "retroactiveApplication": true,    // Se aplica a carritos existentes
  "realTimeUpdate": true,           // Actualiza en tiempo real
  "notifyCartUsers": true,          // Notifica a usuarios con productos en carrito
  "priority": 5                     // Prioridad alta (1-10)
}
```

---

## 🔗 API ENDPOINTS EXPANDIDOS

### **👥 ENDPOINTS PÚBLICOS**

#### `GET /promotions/types`
Obtener todos los tipos de promociones disponibles
```bash
curl -X GET "http://localhost:3001/promotions/types"
```

#### `GET /promotions/active`
Obtener promociones activas con filtros avanzados
```bash
curl -X GET "http://localhost:3001/promotions/active?type=percentage&category=zapatillas"
```

#### `POST /promotions/apply-to-cart`
Aplicar promociones automáticamente al carrito
```bash
curl -X POST "http://localhost:3001/promotions/apply-to-cart" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product_id",
    "quantity": 2,
    "price": 1999.99
  }'
```

### **👤 ENDPOINTS DE USUARIO**

#### `POST /promotions/calculate-advanced`
Calcular descuentos con todos los tipos nuevos
```bash
curl -X POST "http://localhost:3001/promotions/calculate-advanced" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cartItems": [
      {
        "productId": "product_id",
        "quantity": 3,
        "price": 1999.99,
        "category": "zapatillas"
      }
    ],
    "userId": "user_id",
    "totalAmount": 5999.97
  }'
```

#### `GET /promotions/user-eligible`
Obtener promociones elegibles para el usuario
```bash
curl -X GET "http://localhost:3001/promotions/user-eligible" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **👑 ENDPOINTS DE ADMINISTRADOR**

#### `POST /promotions/create-advanced`
Crear promociones con tipos avanzados
```bash
curl -X POST "http://localhost:3001/promotions/create-advanced" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "3x2 en Zapatillas",
    "type": "pay_x_get_y",
    "target": "specific_products",
    "startDate": "2025-01-21T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z",
    "conditions": {
      "specificProducts": ["product_id_1", "product_id_2"]
    },
    "rules": {
      "payQuantity": 2,
      "getTotalQuantity": 3
    },
    "autoApplyToCart": true,
    "retroactiveApplication": true,
    "realTimeUpdate": true,
    "notifyCartUsers": true,
    "priority": 8
  }'
```

#### `POST /promotions/:id/apply-retroactive`
Aplicar promoción retroactivamente a carritos existentes
```bash
curl -X POST "http://localhost:3001/promotions/promotion_id/apply-retroactive" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

#### `GET /promotions/admin/analytics`
Analytics avanzados de promociones
```bash
curl -X GET "http://localhost:3001/promotions/admin/analytics" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

---

## 📊 EJEMPLOS PRÁCTICOS DE USO

### **Ejemplo 1: Promoción 3x2 con Aplicación Automática**
```json
{
  "name": "3x2 en Remeras - Aplicación Automática",
  "type": "pay_x_get_y",
  "target": "specific_products",
  "startDate": "2025-01-21T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "conditions": {
    "specificProducts": ["remera_1", "remera_2", "remera_3"],
    "minimumQuantity": 2
  },
  "rules": {
    "payQuantity": 2,
    "getTotalQuantity": 3
  },
  "autoApplyToCart": true,
  "retroactiveApplication": true,
  "notifyCartUsers": true,
  "priority": 9
}
```

**Resultado**: Los usuarios que ya tienen 2+ remeras en su carrito recibirán automáticamente el descuento y una notificación.

### **Ejemplo 2: Descuento Progresivo con Notificaciones**
```json
{
  "name": "El 2do al 50%, el 3ro al 75%",
  "type": "progressive_quantity_discount",
  "target": "category",
  "startDate": "2025-01-21T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "conditions": {
    "categories": ["zapatillas"],
    "minimumQuantity": 2
  },
  "rules": {
    "progressiveTiers": [
      { "position": 1, "discount": 0, "discountType": "percentage" },
      { "position": 2, "discount": 50, "discountType": "percentage" },
      { "position": 3, "discount": 75, "discountType": "percentage" }
    ]
  },
  "autoApplyToCart": true,
  "realTimeUpdate": true,
  "priority": 7
}
```

**Resultado**: 
- 1ra zapatilla: precio normal
- 2da zapatilla: 50% OFF
- 3ra zapatilla: 75% OFF

### **Ejemplo 3: Descuento por Horario con Aplicación Inteligente**
```json
{
  "name": "Happy Hour - Viernes 18-22",
  "type": "time_based_discount",
  "target": "all_products",
  "startDate": "2025-01-21T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "rules": {
    "timeSlots": [
      {
        "dayOfWeek": 5,
        "startHour": 18,
        "endHour": 22,
        "discount": 20,
        "discountType": "percentage"
      }
    ]
  },
  "autoApplyToCart": true,
  "realTimeUpdate": true,
  "priority": 6
}
```

**Resultado**: Los viernes de 18:00 a 22:00, todos los productos tienen 20% OFF automáticamente.

### **Ejemplo 4: Bundle con Regalo**
```json
{
  "name": "Kit Deportivo + Regalo",
  "type": "bundle_offer",
  "target": "specific_products",
  "startDate": "2025-01-21T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "conditions": {
    "specificProducts": ["remera", "short", "medias"]
  },
  "rules": {
    "bundleItems": [
      { "productId": "remera", "requiredQuantity": 1, "discount": 15, "discountType": "percentage" },
      { "productId": "short", "requiredQuantity": 1, "discount": 15, "discountType": "percentage" },
      { "productId": "medias", "requiredQuantity": 1, "discount": 15, "discountType": "percentage" }
    ]
  },
  "autoApplyToCart": true,
  "notifyCartUsers": true,
  "priority": 8
}
```

**Resultado**: Si el usuario tiene los 3 productos del kit, cada uno recibe 15% OFF automáticamente.

---

## 🔧 CONFIGURACIÓN TÉCNICA

### **Variables de Entorno Requeridas**
```env
# Sistema de Notificaciones (para aplicación automática)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-password

SMS_API_KEY=tu-sms-api-key
SMS_SECRET=tu-sms-secret
SMS_SENDER_ID=NabraXR

PUSH_API_KEY=tu-push-api-key

# Base de datos
MONGODB_URI=mongodb://localhost:27017/nabra_xr
```

### **Dependencias NPM Requeridas**
```json
{
  "dependencies": {
    "@nestjs/schedule": "^4.0.0",
    "nodemailer": "^6.9.0",
    "handlebars": "^4.7.8"
  }
}
```

---

## 📈 MÉTRICAS Y ANALYTICS

### **Métricas Disponibles**
- **Conversión por tipo de promoción**
- **Aplicación automática exitosa**
- **Notificaciones enviadas y abiertas**
- **Carritos recuperados con descuentos**
- **ROI por promoción**
- **Tiempo promedio de aplicación automática**

### **Dashboard de Administración**
- **Vista en tiempo real** de promociones activas
- **Métricas de aplicación automática**
- **Estados de notificaciones**
- **Análisis de conversión**
- **Gestión de prioridades**

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

1. **✅ Completado**: Sistema de promociones expandido con 20+ tipos
2. **✅ Completado**: Aplicación automática a carritos existentes
3. **✅ Completado**: Notificaciones automáticas
4. **✅ Completado**: Actualización en tiempo real

### **🎯 Próximas Implementaciones Sugeridas**
1. **Sistema de Wishlist** - Lista de deseos con notificaciones
2. **Motor de Recomendaciones** - IA para sugerir productos
3. **Dashboard de Analytics** - Reportes avanzados de ventas
4. **A/B Testing** - Pruebas de promociones
5. **Gamificación** - Sistema de puntos y recompensas

---

## 🎉 RESUMEN DE LO IMPLEMENTADO

### **🎁 20+ Tipos de Promociones**
- Tipos básicos existentes + 14 nuevos tipos avanzados
- Desde descuentos simples hasta bundles complejos
- Promociones temporales, estacionales y por fidelidad

### **🤖 Sistema Automático Inteligente**
- Aplicación retroactiva a carritos existentes
- Actualización en tiempo real
- Notificaciones automáticas a usuarios
- Validación continua de condiciones

### **⚡ Características Avanzadas**
- Priorización de promociones
- Configuración granular por tipo
- Métricas y analytics completos
- API RESTful expandida

**¡El sistema de promociones está ahora completamente expandido y listo para maximizar las ventas y mejorar la experiencia del usuario!** 🚀
