# 📚 Documentación de API - Nabra XR Backend

## 🔗 Base URL
```
http://localhost:3000
```

## 🔐 Autenticación
Todos los endpoints requieren autenticación JWT excepto los marcados con `@Public()`.

**Header requerido:**
```
Authorization: Bearer <jwt_token>
```

---

## 🛒 CARRITO DE COMPRAS

### Obtener Carrito del Usuario
```http
GET /cart
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "_id": "cart_id",
  "userId": "user_id",
  "items": [
    {
      "_id": "item_id",
      "product": {
        "_id": "product_id",
        "name": "Producto",
        "price": 29.99,
        "description": "Descripción",
        "images": ["image1.jpg", "image2.jpg"],
        "stock": 10,
        "isPreorder": false,
        "sizes": ["S", "M", "L"]
      },
      "quantity": 2,
      "size": "M"
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Agregar Producto al Carrito
```http
POST /cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id",
  "quantity": 1,
  "size": "M"
}
```

**Respuesta:** Carrito actualizado (misma estructura que GET /cart)

### Actualizar Item del Carrito
```http
PUT /cart/update/:itemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3,
  "size": "L"
}
```

**Respuesta:** Carrito actualizado

### Eliminar Item del Carrito
```http
DELETE /cart/remove/:itemId
Authorization: Bearer <token>
```

**Respuesta:** Carrito actualizado

### Limpiar Carrito
```http
DELETE /cart/clear
Authorization: Bearer <token>
```

**Respuesta:** Carrito vacío

### Validar Carrito para Checkout
```http
GET /cart/validate
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    "Producto X: Solo 2 disponibles (tienes 3 en el carrito)"
  ]
}
```

### Obtener Resumen del Carrito
```http
GET /cart/summary
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "items": [
    {
      "_id": "item_id",
      "product": {
        "_id": "product_id",
        "name": "Producto",
        "price": 29.99,
        "images": ["image1.jpg"],
        "stock": 10,
        "isPreorder": false
      },
      "quantity": 2,
      "size": "M",
      "itemTotal": 59.98
    }
  ],
  "totalItems": 1,
  "totalQuantity": 2,
  "subtotal": 59.98,
  "estimatedTax": 5.99,
  "estimatedTotal": 65.97,
  "currency": "USD"
}
```

### Checkout del Carrito Completo
```http
POST /cart/checkout?returnUrl=https://mi-app.com/success&cancelUrl=https://mi-app.com/cancel
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "id": "payment_id",
  "status": "pending",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=EC-..."
}
```

---

## 💳 PAGOS

### Crear Pago desde Carrito Completo
```http
POST /payments/from-cart?returnUrl=https://mi-app.com/success&cancelUrl=https://mi-app.com/cancel
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "id": "payment_id",
  "status": "pending",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=EC-..."
}
```

### Crear Pago Parcial desde Carrito
```http
POST /payments/partial-checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "itemId": "cart_item_id",
      "quantity": 1
    }
  ],
  "returnUrl": "https://mi-app.com/success",
  "cancelUrl": "https://mi-app.com/cancel"
}
```

**Respuesta:**
```json
{
  "id": "payment_id",
  "status": "pending",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=EC-..."
}
```

### Crear Pago Directo
```http
POST /payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id",
  "description": "Pago de productos",
  "items": [
    {
      "name": "Producto 1",
      "description": "Descripción del producto",
      "quantity": 1,
      "price": 29.99,
      "currency": "USD"
    }
  ],
  "totalAmount": 29.99,
  "currency": "USD",
  "returnUrl": "https://mi-app.com/success",
  "cancelUrl": "https://mi-app.com/cancel"
}
```

**Respuesta:**
```json
{
  "id": "payment_id",
  "status": "pending",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=EC-..."
}
```

### Capturar Pago
```http
POST /payments/:paymentId/capture
Content-Type: application/json

{
  "paymentId": "payment_id",
  "payerId": "payer_id"
}
```

**Respuesta:**
```json
{
  "id": "payment_id",
  "status": "completed"
}
```

### Obtener Detalles del Pago
```http
GET /payments/:paymentId
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "_id": "payment_id",
  "userId": "user_id",
  "provider": "paypal",
  "providerPaymentId": "EC-...",
  "status": "completed",
  "amount": 29.99,
  "currency": "USD",
  "description": "Pago de productos",
  "orderId": "order_id",
  "items": [
    {
      "name": "Producto 1",
      "description": "Descripción",
      "quantity": 1,
      "price": 29.99,
      "currency": "USD"
    }
  ],
  "approvalUrl": "https://...",
  "captureId": "capture_id",
  "payerId": "payer_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Obtener Historial de Pagos del Usuario
```http
GET /payments?limit=10&offset=0
Authorization: Bearer <token>
```

**Respuesta:** Array de pagos con la estructura anterior

### Cancelar Pago
```http
DELETE /payments/:paymentId
Authorization: Bearer <token>
```

**Respuesta:** `204 No Content`

---

## 🔄 CALLBACKS DE PAYPAL (Públicos)

### Pago Exitoso
```http
GET /payments/paypal/success?token=EC-...&PayerID=payer_id
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Payment completed successfully",
  "payment": {
    "id": "payment_id",
    "status": "completed"
  }
}
```

### Pago Cancelado
```http
GET /payments/paypal/cancel?token=EC-...
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Payment cancelled successfully",
  "token": "EC-..."
}
```

---

## 📦 ÓRDENES

### Crear Orden desde Checkout Parcial
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "cartId": "cart_id",
  "items": [
    {
      "itemId": "cart_item_id",
      "quantity": 1
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "paymentMethod": "paypal"
}
```

**Respuesta:**
```json
{
  "_id": "order_id",
  "userId": "user_id",
  "items": [
    {
      "product": {
        "_id": "product_id",
        "name": "Producto",
        "price": 29.99
      },
      "quantity": 1,
      "size": "M"
    }
  ],
  "status": "pending",
  "totalAmount": 29.99,
  "currency": "USD",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "paymentMethod": "paypal",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Obtener Órdenes del Usuario
```http
GET /orders/my-orders?limit=10&offset=0
Authorization: Bearer <token>
```

**Respuesta:** Array de órdenes

### Obtener Resumen de Órdenes del Usuario
```http
GET /orders/my-orders/summary
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "totalOrders": 5,
  "pendingOrders": 1,
  "completedOrders": 3,
  "cancelledOrders": 1,
  "totalSpent": 299.95
}
```

### Obtener Orden Específica del Usuario
```http
GET /orders/my-orders/:id
Authorization: Bearer <token>
```

**Respuesta:** Detalles completos de la orden

### Obtener Orden por ID (General)
```http
GET /orders/:id
Authorization: Bearer <token>
```

**Respuesta:** Detalles completos de la orden

---

## 🛍️ PRODUCTOS

### Obtener Todos los Productos
```http
GET /products
```

**Respuesta:**
```json
[
  {
    "_id": "product_id",
    "name": "Producto",
    "description": "Descripción",
    "price": 29.99,
    "images": ["image1.jpg", "image2.jpg"],
    "stock": 10,
    "isPreorder": false,
    "sizes": ["S", "M", "L"],
    "category": "category_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Obtener Producto por ID
```http
GET /products/:id
```

**Respuesta:** Detalles completos del producto

---

## 👤 USUARIOS

### Obtener Perfil del Usuario
```http
GET /users/profile
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "_id": "user_id",
  "email": "usuario@email.com",
  "name": "Nombre Usuario",
  "role": "user",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Actualizar Perfil
```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nuevo Nombre"
}
```

**Respuesta:** Perfil actualizado

---

## 🔐 AUTENTICACIÓN

### Registro
```http
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "password123",
  "name": "Nombre Usuario"
}
```

**Respuesta:**
```json
{
  "access_token": "jwt_token",
  "user": {
    "_id": "user_id",
    "email": "usuario@email.com",
    "name": "Nombre Usuario",
    "role": "user"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "access_token": "jwt_token",
  "user": {
    "_id": "user_id",
    "email": "usuario@email.com",
    "name": "Nombre Usuario",
    "role": "user"
  }
}
```

---

## 📊 ESTADOS Y ENUMERACIONES

### Estados de Pago
```typescript
enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved', 
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}
```

### Estados de Orden
```typescript
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}
```

### Roles de Usuario
```typescript
enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}
```

---

## 🚨 CÓDIGOS DE ERROR COMUNES

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: stock insuficiente) |
| 500 | Internal Server Error - Error del servidor |

### Formato de Error
```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request"
}
```

---

## 🔄 FLUJO COMPLETO DE COMPRA

### 1. Usuario agrega productos al carrito
```bash
POST /cart/add
```

### 2. Validar carrito antes del checkout
```bash
GET /cart/validate
```

### 3. Obtener resumen del carrito
```bash
GET /cart/summary
```

### 4. Iniciar checkout
```bash
POST /cart/checkout
# o para checkout parcial:
POST /payments/partial-checkout
```

### 5. Redirigir usuario a PayPal usando `approvalUrl`

### 6. PayPal redirige de vuelta:
- **Éxito:** `/payments/paypal/success?token=EC-...&PayerID=payer_id`
- **Cancelación:** `/payments/paypal/cancel?token=EC-...`

### 7. El sistema automáticamente:
- Captura el pago
- Crea la orden
- Actualiza el stock
- Limpia el carrito

---

## 💡 NOTAS IMPORTANTES PARA EL FRONTEND

1. **Validación de Carrito:** Siempre validar el carrito antes del checkout
2. **Manejo de Stock:** El sistema valida stock en tiempo real
3. **URLs de Redirección:** Configurar correctamente `returnUrl` y `cancelUrl`
4. **Estados de Pago:** Monitorear el estado del pago para mostrar feedback al usuario
5. **Manejo de Errores:** Implementar manejo robusto de errores para todos los endpoints
6. **Tokens JWT:** Manejar correctamente la expiración y renovación de tokens
7. **Responsive:** Considerar la experiencia en móviles para el flujo de PayPal

---

## 🧪 TESTING

### Credenciales de Sandbox PayPal
- Usar `PAYPAL_ENVIRONMENT=sandbox`
- Usar tarjetas de prueba de PayPal
- Verificar que los pagos se capturen correctamente

### URLs de Testing
```
returnUrl: http://localhost:3001/success
cancelUrl: http://localhost:3001/cancel
```
