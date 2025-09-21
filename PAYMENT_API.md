# API de Pagos PayPal - Nabra XR

## Endpoints del Carrito

### Obtener Carrito
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
        "description": "Descripción del producto"
      },
      "quantity": 2,
      "size": "M"
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Agregar al Carrito
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

### Eliminar del Carrito
```http
DELETE /cart/remove/:itemId
Authorization: Bearer <token>
```

### Obtener Total del Carrito
```http
GET /cart/total
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "total": 59.98,
  "currency": "USD",
  "itemCount": 2
}
```

### Checkout del Carrito
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

## Endpoints de Pagos

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

### Crear Pago desde Carrito
```http
POST /payments/from-cart?returnUrl=https://mi-app.com/success&cancelUrl=https://mi-app.com/cancel
Authorization: Bearer <token>
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
  "items": [...],
  "approvalUrl": "https://...",
  "captureId": "capture_id",
  "payerId": "payer_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Obtener Historial de Pagos
```http
GET /payments?limit=10&offset=0
Authorization: Bearer <token>
```

### Cancelar Pago
```http
DELETE /payments/:paymentId
Authorization: Bearer <token>
```

## Endpoints de Redirección

### Pago Exitoso
```http
GET /payments/success?paymentId=EC-...&PayerID=payer_id
```

### Pago Cancelado
```http
GET /payments/cancel?token=EC-...
```

## Estados de Pago

- `pending`: Pago creado, esperando aprobación del usuario
- `approved`: Pago aprobado por el usuario, listo para capturar
- `completed`: Pago completado exitosamente
- `cancelled`: Pago cancelado por el usuario
- `failed`: Pago falló por algún error

## Flujo Completo de Pago

1. **Agregar productos al carrito:**
   ```bash
   POST /cart/add
   ```

2. **Verificar total:**
   ```bash
   GET /cart/total
   ```

3. **Iniciar checkout:**
   ```bash
   POST /cart/checkout
   ```

4. **Redirigir usuario a PayPal** usando la `approvalUrl` de la respuesta

5. **PayPal redirige de vuelta** a `/payments/success` o `/payments/cancel`

6. **El sistema captura automáticamente** el pago cuando el usuario regresa

## Manejo de Errores

Todos los endpoints pueden retornar errores con el siguiente formato:

```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request"
}
```

Códigos de error comunes:
- `400`: Bad Request - Datos inválidos
- `401`: Unauthorized - Token inválido o expirado
- `404`: Not Found - Recurso no encontrado
- `500`: Internal Server Error - Error del servidor

## Configuración de PayPal

Asegúrate de configurar las siguientes variables de entorno:

```bash
PAYPAL_CLIENT_ID=tu_client_id
PAYPAL_CLIENT_SECRET=tu_client_secret
PAYPAL_ENVIRONMENT=sandbox  # o 'production'
BASE_URL=http://localhost:3000
```



