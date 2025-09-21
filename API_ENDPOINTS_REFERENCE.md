# 📍 Referencia de Endpoints - Nabra XR API

## 🔗 Base URL
```
http://localhost:3000
```

---

## 🔐 AUTENTICACIÓN

| Método | Endpoint | Descripción | Auth | Body |
|--------|----------|-------------|------|------|
| POST | `/auth/register` | Registrar usuario | ❌ | `{email, password, name}` |
| POST | `/auth/login` | Iniciar sesión | ❌ | `{email, password}` |

---

## 👤 USUARIOS

| Método | Endpoint | Descripción | Auth | Query Params |
|--------|----------|-------------|------|--------------|
| GET | `/users/profile` | Obtener perfil | ✅ | - |
| PUT | `/users/profile` | Actualizar perfil | ✅ | - |

---

## 🛍️ PRODUCTOS

| Método | Endpoint | Descripción | Auth | Query Params |
|--------|----------|-------------|------|--------------|
| GET | `/products` | Obtener todos los productos | ❌ | `page, limit, category, search` |
| GET | `/products/:id` | Obtener producto por ID | ❌ | - |

---

## 🛒 CARRITO DE COMPRAS

| Método | Endpoint | Descripción | Auth | Body/Query |
|--------|----------|-------------|------|------------|
| GET | `/cart` | Obtener carrito del usuario | ✅ | - |
| POST | `/cart/add` | Agregar producto al carrito | ✅ | `{productId, quantity, size?}` |
| PUT | `/cart/update/:itemId` | Actualizar item del carrito | ✅ | `{quantity?, size?}` |
| DELETE | `/cart/remove/:itemId` | Eliminar item del carrito | ✅ | - |
| DELETE | `/cart/clear` | Limpiar carrito | ✅ | - |
| GET | `/cart/validate` | Validar carrito para checkout | ✅ | - |
| GET | `/cart/summary` | Obtener resumen del carrito | ✅ | - |
| POST | `/cart/checkout` | Checkout completo del carrito | ✅ | `returnUrl, cancelUrl` |

---

## 💳 PAGOS

| Método | Endpoint | Descripción | Auth | Body/Query |
|--------|----------|-------------|------|------------|
| POST | `/payments/from-cart` | Crear pago desde carrito completo | ✅ | `returnUrl, cancelUrl` |
| POST | `/payments/partial-checkout` | Crear pago parcial | ✅ | `{items[], returnUrl?, cancelUrl?}` |
| POST | `/payments` | Crear pago directo | ✅ | `CreatePaymentDto` |
| POST | `/payments/:paymentId/capture` | Capturar pago | ✅ | `{paymentId, payerId?}` |
| GET | `/payments/:paymentId` | Obtener detalles del pago | ✅ | - |
| GET | `/payments` | Obtener historial de pagos | ✅ | `limit, offset` |
| DELETE | `/payments/:paymentId` | Cancelar pago | ✅ | - |
| POST | `/payments/webhook/paypal` | Webhook de PayPal | ❌ | Webhook data |

---

## 🔄 CALLBACKS DE PAYPAL (Públicos)

| Método | Endpoint | Descripción | Auth | Query Params |
|--------|----------|-------------|------|--------------|
| GET | `/payments/paypal/success` | Pago exitoso | ❌ | `token, PayerID` |
| GET | `/payments/paypal/cancel` | Pago cancelado | ❌ | `token` |

---

## 📦 ÓRDENES

| Método | Endpoint | Descripción | Auth | Body/Query |
|--------|----------|-------------|------|------------|
| POST | `/orders` | Crear orden desde checkout parcial | ✅ | `CheckoutPartialDto` |
| GET | `/orders/my-orders` | Obtener órdenes del usuario | ✅ | `limit, offset` |
| GET | `/orders/my-orders/summary` | Resumen de órdenes del usuario | ✅ | - |
| GET | `/orders/my-orders/:id` | Obtener orden específica del usuario | ✅ | - |
| GET | `/orders/:id` | Obtener orden por ID | ✅ | - |
| GET | `/orders` | Obtener todas las órdenes (Admin) | ✅ (Admin) | - |
| PUT | `/orders/:id/status` | Actualizar estado de orden (Admin) | ✅ (Admin) | `{status, trackingNumber?, notes?}` |

---

## 📁 MEDIOS

| Método | Endpoint | Descripción | Auth | Body |
|--------|----------|-------------|------|------|
| POST | `/media/upload` | Subir archivo | ✅ (Admin) | `FormData` |
| GET | `/media/:filename` | Obtener archivo | ❌ | - |
| DELETE | `/media/:filename` | Eliminar archivo | ✅ (Admin) | - |

---

## 🔍 QUERY PARAMETERS COMUNES

### Paginación
```
?page=1&limit=10
?offset=0&limit=20
```

### Filtros de Productos
```
?category=electronics
?minPrice=10&maxPrice=100
?inStock=true
?isPreorder=false
?sizes=S,M,L
?search=keyword
```

### Ordenamiento
```
?sortBy=price&sortOrder=asc
?sortBy=createdAt&sortOrder=desc
```

---

## 📊 CÓDIGOS DE ESTADO HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 200 | OK | Solicitud exitosa |
| 201 | Created | Recurso creado exitosamente |
| 204 | No Content | Solicitud exitosa sin contenido |
| 400 | Bad Request | Datos de solicitud inválidos |
| 401 | Unauthorized | Token JWT inválido o faltante |
| 403 | Forbidden | Sin permisos para el recurso |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto (ej: stock insuficiente) |
| 422 | Unprocessable Entity | Datos válidos pero no procesables |
| 500 | Internal Server Error | Error interno del servidor |

---

## 🔒 AUTENTICACIÓN

### Header Requerido
```http
Authorization: Bearer <jwt_token>
```

### Ejemplo de Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

---

## 📝 FORMATO DE RESPUESTAS

### Respuesta Exitosa
```json
{
  "data": { ... },
  "message": "Operación exitosa"
}
```

### Respuesta de Error
```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request"
}
```

### Respuesta Paginada
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "hasNext": true,
  "hasPrev": false
}
```

---

## 🧪 TESTING

### URLs de Desarrollo
```
API Base: http://localhost:3000
Frontend: http://localhost:3001
PayPal Return: http://localhost:3001/success
PayPal Cancel: http://localhost:3001/cancel
```

### Variables de Entorno para Testing
```bash
NODE_ENV=development
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_CLIENT_ID=tu_sandbox_client_id
PAYPAL_CLIENT_SECRET=tu_sandbox_client_secret
```

---

## 🔄 FLUJO DE PAGOS

### 1. Checkout Completo
```
POST /cart/checkout?returnUrl=...&cancelUrl=...
↓
Redirect to PayPal approval URL
↓
GET /payments/paypal/success?token=...&PayerID=...
```

### 2. Checkout Parcial
```
POST /payments/partial-checkout
↓
Redirect to PayPal approval URL
↓
GET /payments/paypal/success?token=...&PayerID=...
```

---

## 📱 ENDPOINTS MÓVILES

### Optimizados para Móvil
- Todos los endpoints soportan requests desde móviles
- PayPal detecta automáticamente dispositivos móviles
- Respuestas incluyen metadatos para UI móvil

### Headers Recomendados para Móvil
```http
Accept: application/json
Content-Type: application/json
User-Agent: MobileApp/1.0
```

---

## 🔍 MONITOREO Y LOGS

### Endpoints de Health Check
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado general de la API |
| GET | `/health/db` | Estado de la base de datos |
| GET | `/health/paypal` | Estado de la conexión con PayPal |

---

## 📋 RATE LIMITING

### Límites por Endpoint
```
POST /auth/*: 5 requests/min
POST /cart/add: 20 requests/min
POST /payments/*: 10 requests/min
GET /*: 100 requests/min
```

### Headers de Rate Limit
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 🛡️ SEGURIDAD

### Headers de Seguridad
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

### Validación de Input
- Todos los endpoints validan input con class-validator
- Sanitización automática de datos
- Protección contra inyección SQL y XSS

---

## 📞 SOPORTE

### Contacto Técnico
- Email: dev@nabra-xr.com
- Slack: #backend-support
- Documentación: [API Docs](http://localhost:3000/docs)

### Horarios de Soporte
- Lunes - Viernes: 9:00 AM - 6:00 PM
- Emergencias: 24/7 (Solo críticas)
