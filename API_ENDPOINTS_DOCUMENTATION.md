# Documentación de Endpoints - Backend Nabra XR1

Este documento detalla todos los endpoints disponibles en la API del backend, incluyendo métodos HTTP, URLs, parámetros, respuestas y posibles errores.

## Base URL
```
http://localhost:3000
```

## Autenticación
- **JWT Bearer Token** requerido para la mayoría de endpoints (excepto los marcados como `@Public()`)
- Header: `Authorization: Bearer <token>`

---

## 📍 **ENDPOINTS GENERALES**

### GET /
**Descripción:** Endpoint de prueba básico
- **Método:** `GET`
- **URL:** `/`
- **Autenticación:** No requerida
- **Parámetros:** Ninguno
- **Respuesta:**
  ```json
  "Hello World!"
  ```
- **Errores:** Ninguno

---

## 🔐 **ENDPOINTS DE AUTENTICACIÓN** (`/auth`)

### POST /auth/register
**Descripción:** Registro de nuevos usuarios
- **Método:** `POST`
- **URL:** `/auth/register`
- **Autenticación:** No requerida (`@Public()`)
- **Body:**
  ```json
  {
    "email": "string (email válido)",
    "password": "string (mínimo 6 caracteres)",
    "name": "string",
    "street": "string (opcional)",
    "city": "string (opcional)",
    "zip": "string (opcional)",
    "country": "string (opcional)"
  }
  ```
- **Respuesta:**
  ```json
  {
    "user": {
      "_id": "string",
      "email": "string",
      "name": "string",
      "role": "user",
      "address": {
        "street": "string",
        "city": "string",
        "zip": "string",
        "country": "string"
      },
      "createdAt": "date",
      "updatedAt": "date"
    },
    "token": "string (JWT)"
  }
  ```
- **Errores:**
  - `400 Bad Request`: Email inválido, contraseña muy corta
  - `409 Conflict`: Email ya existe

### POST /auth/login
**Descripción:** Inicio de sesión de usuarios
- **Método:** `POST`
- **URL:** `/auth/login`
- **Autenticación:** No requerida (`@Public()`)
- **Body:**
  ```json
  {
    "email": "string (email válido)",
    "password": "string (mínimo 6 caracteres)"
  }
  ```
- **Respuesta:**
  ```json
  {
    "user": {
      "_id": "string",
      "email": "string",
      "name": "string",
      "role": "string",
      "address": "object"
    },
    "token": "string (JWT)"
  }
  ```
- **Errores:**
  - `400 Bad Request`: Credenciales inválidas
  - `401 Unauthorized`: Usuario no encontrado o contraseña incorrecta

### GET /auth/protected
**Descripción:** Endpoint de prueba para rutas protegidas
- **Método:** `GET`
- **URL:** `/auth/protected`
- **Autenticación:** Requerida (JWT)
- **Parámetros:** Ninguno
- **Respuesta:**
  ```json
  {
    "message": "This is a protected route"
  }
  ```
- **Errores:**
  - `401 Unauthorized`: Token inválido o expirado

---

## 👤 **ENDPOINTS DE USUARIOS** (`/users`)

### GET /users/profile
**Descripción:** Obtener perfil del usuario autenticado
- **Método:** `GET`
- **URL:** `/users/profile`
- **Autenticación:** Requerida (JWT)
- **Parámetros:** Ninguno
- **Respuesta:**
  ```json
  {
    "_id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "address": {
      "street": "string",
      "city": "string",
      "zip": "string",
      "country": "string"
    },
    "createdAt": "date",
    "updatedAt": "date"
  }
  ```
- **Errores:**
  - `401 Unauthorized`: Token inválido
  - `404 Not Found`: Usuario no encontrado

### PUT /users/profile
**Descripción:** Actualizar perfil del usuario autenticado
- **Método:** `PUT`
- **URL:** `/users/profile`
- **Autenticación:** Requerida (JWT)
- **Body:**
  ```json
  {
    "name": "string (opcional)",
    "street": "string (opcional)",
    "city": "string (opcional)",
    "zip": "string (opcional)",
    "country": "string (opcional)"
  }
  ```
- **Respuesta:** Mismo formato que GET /users/profile
- **Errores:**
  - `400 Bad Request`: Datos inválidos
  - `401 Unauthorized`: Token inválido

### GET /users
**Descripción:** Obtener todos los usuarios (solo administradores)
- **Método:** `GET`
- **URL:** `/users`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:** Ninguno
- **Respuesta:**
  ```json
  [
    {
      "_id": "string",
      "email": "string",
      "name": "string",
      "role": "string",
      "address": "object",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
  ```
- **Errores:**
  - `401 Unauthorized`: Token inválido
  - `403 Forbidden`: Permisos insuficientes (no es admin)

### PUT /users/:id/role
**Descripción:** Actualizar rol de usuario (solo administradores)
- **Método:** `PUT`
- **URL:** `/users/:id/role`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID del usuario a actualizar
- **Body:**
  ```json
  {
    "role": "user" | "admin"
  }
  ```
- **Respuesta:** Objeto User actualizado
- **Errores:**
  - `400 Bad Request`: Rol inválido
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Usuario no encontrado

### DELETE /users/:id
**Descripción:** Eliminar usuario (solo administradores)
- **Método:** `DELETE`
- **URL:** `/users/:id`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID del usuario a eliminar
- **Respuesta:** `void` (204 No Content)
- **Errores:**
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Usuario no encontrado

---

## 🛍️ **ENDPOINTS DE PRODUCTOS** (`/products`)

### GET /products
**Descripción:** Obtener todos los productos con filtros opcionales
- **Método:** `GET`
- **URL:** `/products`
- **Autenticación:** No requerida (`@Public()`)
- **Query Parameters:**
  - `category`: Filtro por categoría
  - `minPrice`: Precio mínimo
  - `maxPrice`: Precio máximo
  - `isPreorder`: Filtro por pre-orden (true/false)
  - `isFeatured`: Filtro por destacados (true/false)
- **Respuesta:**
  ```json
  [
    {
      "_id": "string",
      "name": "string",
      "description": "string",
      "price": "number",
      "category": "string",
      "sizes": ["string"],
      "images": ["string"],
      "stock": "number",
      "isPreorder": "boolean",
      "isFeatured": "boolean",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
  ```
- **Errores:** Ninguno

### GET /products/search
**Descripción:** Buscar productos por texto
- **Método:** `GET`
- **URL:** `/products/search`
- **Autenticación:** No requerida (`@Public()`)
- **Query Parameters:**
  - `q`: Término de búsqueda
- **Respuesta:** Array de productos que coinciden con la búsqueda
- **Errores:** Ninguno

### GET /products/preorders
**Descripción:** Obtener productos en pre-orden
- **Método:** `GET`
- **URL:** `/products/preorders`
- **Autenticación:** No requerida (`@Public()`)
- **Respuesta:** Array de productos con `isPreorder: true`
- **Errores:** Ninguno

### GET /products/featured
**Descripción:** Obtener productos destacados
- **Método:** `GET`
- **URL:** `/products/featured`
- **Autenticación:** No requerida (`@Public()`)
- **Respuesta:** Array de productos con `isFeatured: true`
- **Errores:** Ninguno

### GET /products/:id
**Descripción:** Obtener producto por ID
- **Método:** `GET`
- **URL:** `/products/:id`
- **Autenticación:** No requerida (`@Public()`)
- **Parámetros:**
  - `id` (path): ID del producto
- **Respuesta:** Objeto Product
- **Errores:**
  - `404 Not Found`: Producto no encontrado

### POST /products
**Descripción:** Crear nuevo producto (solo administradores)
- **Método:** `POST`
- **URL:** `/products`
- **Autenticación:** Requerida (JWT + rol admin)
- **Body:**
  ```json
  {
    "name": "string",
    "description": "string",
    "price": "number",
    "category": "string",
    "sizes": ["string"],
    "images": ["string"] (opcional),
    "stock": "number",
    "isPreorder": "boolean" (opcional),
    "isFeatured": "boolean" (opcional)
  }
  ```
- **Respuesta:** Objeto Product creado
- **Errores:**
  - `400 Bad Request`: Datos inválidos
  - `403 Forbidden`: Permisos insuficientes

### PUT /products/:id
**Descripción:** Actualizar producto (solo administradores)
- **Método:** `PUT`
- **URL:** `/products/:id`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID del producto
- **Body:** Mismo formato que POST, todos los campos opcionales
- **Respuesta:** Objeto Product actualizado
- **Errores:**
  - `400 Bad Request`: Datos inválidos
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Producto no encontrado

### DELETE /products/:id
**Descripción:** Eliminar producto (solo administradores)
- **Método:** `DELETE`
- **URL:** `/products/:id`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID del producto
- **Respuesta:** `void` (204 No Content)
- **Errores:**
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Producto no encontrado

### POST /products/:id/images
**Descripción:** Agregar imagen a producto (solo administradores)
- **Método:** `POST`
- **URL:** `/products/:id/images`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID del producto
- **Body:**
  ```json
  {
    "imageUrl": "string"
  }
  ```
- **Respuesta:** Objeto Product actualizado
- **Errores:**
  - `400 Bad Request`: URL inválida
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Producto no encontrado

---

## 🛒 **ENDPOINTS DE CARRITO** (`/cart`)

### GET /cart
**Descripción:** Obtener carrito del usuario autenticado
- **Método:** `GET`
- **URL:** `/cart`
- **Autenticación:** Requerida (JWT)
- **Respuesta:**
  ```json
  {
    "_id": "string",
    "userId": "string",
    "items": [
      {
        "_id": "string",
        "product": {
          "_id": "string",
          "name": "string",
          "price": "number",
          "images": ["string"]
        },
        "quantity": "number",
        "size": "string"
      }
    ],
    "createdAt": "date",
    "updatedAt": "date"
  }
  ```
- **Errores:**
  - `401 Unauthorized`: Token inválido

### POST /cart/add
**Descripción:** Agregar producto al carrito
- **Método:** `POST`
- **URL:** `/cart/add`
- **Autenticación:** Requerida (JWT)
- **Body:**
  ```json
  {
    "productId": "string (MongoDB ObjectId)",
    "quantity": "number (mínimo 1)",
    "size": "string (opcional)"
  }
  ```
- **Respuesta:** Objeto Cart actualizado
- **Errores:**
  - `400 Bad Request`: Datos inválidos
  - `404 Not Found`: Producto no encontrado
  - `401 Unauthorized`: Token inválido

### PUT /cart/update/:itemId
**Descripción:** Actualizar cantidad o talla de item en carrito
- **Método:** `PUT`
- **URL:** `/cart/update/:itemId`
- **Autenticación:** Requerida (JWT)
- **Parámetros:**
  - `itemId` (path): ID del item en el carrito
- **Body:**
  ```json
  {
    "quantity": "number (mínimo 1, opcional)",
    "size": "string (opcional)"
  }
  ```
- **Respuesta:** Objeto Cart actualizado
- **Errores:**
  - `400 Bad Request`: Datos inválidos
  - `404 Not Found`: Item no encontrado
  - `401 Unauthorized`: Token inválido

### DELETE /cart/remove/:itemId
**Descripción:** Eliminar item del carrito
- **Método:** `DELETE`
- **URL:** `/cart/remove/:itemId`
- **Autenticación:** Requerida (JWT)
- **Parámetros:**
  - `itemId` (path): ID del item en el carrito
- **Respuesta:** Objeto Cart actualizado
- **Errores:**
  - `404 Not Found`: Item no encontrado
  - `401 Unauthorized`: Token inválido

### POST /cart/checkout
**Descripción:** Procesar checkout del carrito (crear pago)
- **Método:** `POST`
- **URL:** `/cart/checkout`
- **Autenticación:** Requerida (JWT)
- **Query Parameters:**
  - `returnUrl` (opcional): URL de retorno después del pago
  - `cancelUrl` (opcional): URL de cancelación del pago
- **Respuesta:** Objeto Payment con URL de aprobación de PayPal
- **Errores:**
  - `400 Bad Request`: Carrito vacío o datos inválidos
  - `401 Unauthorized`: Token inválido

### GET /cart/total
**Descripción:** Obtener total del carrito
- **Método:** `GET`
- **URL:** `/cart/total`
- **Autenticación:** Requerida (JWT)
- **Respuesta:**
  ```json
  {
    "total": "number",
    "currency": "USD",
    "itemCount": "number"
  }
  ```
- **Errores:**
  - `401 Unauthorized`: Token inválido

---

## 📦 **ENDPOINTS DE ÓRDENES** (`/orders`)

### POST /orders
**Descripción:** Crear orden desde carrito parcial
- **Método:** `POST`
- **URL:** `/orders`
- **Autenticación:** Requerida (JWT)
- **Body:**
  ```json
  {
    "items": [
      {
        "itemId": "string",
        "quantity": "number"
      }
    ],
    "cartId": "string (MongoDB ObjectId)",
    "shippingAddress": {
      "street": "string",
      "city": "string",
      "zip": "string",
      "country": "string"
    }
  }
  ```
- **Respuesta:** Objeto Order creado
- **Errores:**
  - `400 Bad Request`: Datos inválidos
  - `404 Not Found`: Carrito o items no encontrados
  - `401 Unauthorized`: Token inválido

### GET /orders
**Descripción:** Obtener todas las órdenes (solo administradores)
- **Método:** `GET`
- **URL:** `/orders`
- **Autenticación:** Requerida (JWT + rol admin)
- **Respuesta:**
  ```json
  [
    {
      "_id": "string",
      "items": [
        {
          "product": "Product object",
          "quantity": "number",
          "size": "string",
          "price": "number"
        }
      ],
      "userId": "User object",
      "cartId": "Cart object",
      "total": "number",
      "status": "pending" | "paid" | "shipped" | "delivered" | "cancelled",
      "shippingAddress": {
        "street": "string",
        "city": "string",
        "zip": "string",
        "country": "string"
      },
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
  ```
- **Errores:**
  - `403 Forbidden`: Permisos insuficientes
  - `401 Unauthorized`: Token inválido

### GET /orders/:id
**Descripción:** Obtener orden por ID
- **Método:** `GET`
- **URL:** `/orders/:id`
- **Autenticación:** Requerida (JWT)
- **Parámetros:**
  - `id` (path): ID de la orden
- **Respuesta:** Objeto Order
- **Errores:**
  - `403 Forbidden`: No es tu orden y no eres admin
  - `404 Not Found`: Orden no encontrada
  - `401 Unauthorized`: Token inválido

### PUT /orders/:id/status
**Descripción:** Actualizar estado de orden (solo administradores)
- **Método:** `PUT`
- **URL:** `/orders/:id/status`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID de la orden
- **Body:**
  ```json
  {
    "status": "pending" | "paid" | "shipped" | "delivered" | "cancelled"
  }
  ```
- **Respuesta:** Objeto Order actualizado
- **Errores:**
  - `400 Bad Request`: Estado inválido
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Orden no encontrada
  - `401 Unauthorized`: Token inválido

---

## 💳 **ENDPOINTS DE PAGOS** (`/payments`)

### POST /payments
**Descripción:** Crear nuevo pago
- **Método:** `POST`
- **URL:** `/payments`
- **Autenticación:** Requerida (JWT)
- **Body:**
  ```json
  {
    "orderId": "string",
    "description": "string (opcional)",
    "items": [
      {
        "name": "string",
        "description": "string (opcional)",
        "quantity": "number",
        "price": "number",
        "currency": "string (opcional, default USD)"
      }
    ],
    "totalAmount": "number",
    "currency": "string (opcional, default USD)",
    "returnUrl": "string (opcional)",
    "cancelUrl": "string (opcional)"
  }
  ```
- **Respuesta:**
  ```json
  {
    "id": "string",
    "status": "string",
    "approvalUrl": "string",
    "error": "string (si hay error)"
  }
  ```
- **Errores:**
  - `400 Bad Request`: Datos inválidos
  - `401 Unauthorized`: Token inválido

### POST /payments/from-cart
**Descripción:** Crear pago desde carrito
- **Método:** `POST`
- **URL:** `/payments/from-cart`
- **Autenticación:** Requerida (JWT)
- **Query Parameters:**
  - `returnUrl` (opcional): URL de retorno
  - `cancelUrl` (opcional): URL de cancelación
- **Respuesta:** Objeto Payment con approvalUrl
- **Errores:**
  - `400 Bad Request`: Carrito vacío
  - `401 Unauthorized`: Token inválido

### POST /payments/:paymentId/capture
**Descripción:** Capturar pago completado
- **Método:** `POST`
- **URL:** `/payments/:paymentId/capture`
- **Autenticación:** Requerida (JWT)
- **Parámetros:**
  - `paymentId` (path): ID del pago
- **Body:**
  ```json
  {
    "paymentId": "string",
    "payerId": "string (opcional)"
  }
  ```
- **Respuesta:** Objeto Payment capturado
- **Errores:**
  - `400 Bad Request`: Pago no capturable
  - `404 Not Found`: Pago no encontrado
  - `401 Unauthorized`: Token inválido

### GET /payments/:paymentId
**Descripción:** Obtener pago por ID
- **Método:** `GET`
- **URL:** `/payments/:paymentId`
- **Autenticación:** Requerida (JWT)
- **Parámetros:**
  - `paymentId` (path): ID del pago
- **Respuesta:** Objeto Payment
- **Errores:**
  - `404 Not Found`: Pago no encontrado
  - `401 Unauthorized`: Token inválido

### GET /payments
**Descripción:** Obtener pagos del usuario
- **Método:** `GET`
- **URL:** `/payments`
- **Autenticación:** Requerida (JWT)
- **Query Parameters:**
  - `limit`: Número de resultados (1-100, default 10)
  - `offset`: Número de resultados a saltar (default 0)
- **Respuesta:** Array de objetos Payment
- **Errores:**
  - `400 Bad Request`: Parámetros inválidos
  - `401 Unauthorized`: Token inválido

### DELETE /payments/:paymentId
**Descripción:** Cancelar pago
- **Método:** `DELETE`
- **URL:** `/payments/:paymentId`
- **Autenticación:** Requerida (JWT)
- **Parámetros:**
  - `paymentId` (path): ID del pago
- **Respuesta:**
  ```json
  {
    "message": "Payment cancelled successfully"
  }
  ```
- **Errores:**
  - `400 Bad Request`: Pago no cancelable
  - `404 Not Found`: Pago no encontrado
  - `401 Unauthorized`: Token inválido

### GET /payments/success
**Descripción:** Endpoint de retorno después de pago exitoso
- **Método:** `GET`
- **URL:** `/payments/success`
- **Autenticación:** No requerida
- **Query Parameters:**
  - `paymentId`: ID del pago de PayPal
  - `PayerID`: ID del pagador de PayPal
- **Respuesta:**
  ```json
  {
    "success": "boolean",
    "message": "string",
    "payment": "Payment object (si exitoso)",
    "error": "string (si hay error)"
  }
  ```
- **Errores:** Ninguno (manejado internamente)

### GET /payments/cancel
**Descripción:** Endpoint de retorno después de cancelación de pago
- **Método:** `GET`
- **URL:** `/payments/cancel`
- **Autenticación:** No requerida
- **Query Parameters:**
  - `token`: Token del pago cancelado
- **Respuesta:**
  ```json
  {
    "success": "boolean",
    "message": "string",
    "error": "string (si hay error)"
  }
  ```
- **Errores:** Ninguno (manejado internamente)

### POST /payments/webhook/paypal
**Descripción:** Webhook para notificaciones de PayPal
- **Método:** `POST`
- **URL:** `/payments/webhook/paypal`
- **Autenticación:** No requerida
- **Body:** Datos del webhook de PayPal
- **Respuesta:**
  ```json
  {
    "status": "received"
  }
  ```
- **Errores:** Ninguno

---

## 🖼️ **ENDPOINTS DE MEDIA** (`/media`)

### POST /media/upload
**Descripción:** Subir archivo de imagen (solo administradores)
- **Método:** `POST`
- **URL:** `/media/upload`
- **Autenticación:** Requerida (JWT + rol admin)
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file`: Archivo de imagen (JPEG/PNG)
  - `type`: "product" | "cover"
- **Respuesta:**
  ```json
  {
    "_id": "string",
    "url": "string",
    "fileName": "string",
    "type": "string",
    "mimeType": "string",
    "active": "boolean",
    "createdAt": "date",
    "updatedAt": "date"
  }
  ```
- **Errores:**
  - `400 Bad Request`: Tipo de archivo no permitido
  - `403 Forbidden`: Permisos insuficientes
  - `401 Unauthorized`: Token inválido

### GET /media/:id
**Descripción:** Obtener archivo de media por ID
- **Método:** `GET`
- **URL:** `/media/:id`
- **Autenticación:** No requerida (`@Public()`)
- **Parámetros:**
  - `id` (path): ID del archivo de media
- **Respuesta:** Objeto Media
- **Errores:**
  - `404 Not Found`: Archivo no encontrado

### DELETE /media/:id
**Descripción:** Eliminar archivo de media (solo administradores)
- **Método:** `DELETE`
- **URL:** `/media/:id`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID del archivo de media
- **Respuesta:** `void` (204 No Content)
- **Errores:**
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Archivo no encontrado
  - `401 Unauthorized`: Token inválido

### POST /media/cover-image/:id
**Descripción:** Activar imagen como imagen de portada (solo administradores)
- **Método:** `POST`
- **URL:** `/media/cover-image/:id`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID del archivo de media
- **Respuesta:** Objeto Media actualizado
- **Errores:**
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Archivo no encontrado
  - `401 Unauthorized`: Token inválido

### POST /media/cover-image/:id/deactivate
**Descripción:** Desactivar imagen de portada (solo administradores)
- **Método:** `POST`
- **URL:** `/media/cover-image/:id/deactivate`
- **Autenticación:** Requerida (JWT + rol admin)
- **Parámetros:**
  - `id` (path): ID del archivo de media
- **Respuesta:** Objeto Media actualizado
- **Errores:**
  - `403 Forbidden`: Permisos insuficientes
  - `404 Not Found`: Archivo no encontrado
  - `401 Unauthorized`: Token inválido

---

## 📊 **CÓDIGOS DE ESTADO HTTP**

### Éxito (2xx)
- `200 OK`: Solicitud exitosa
- `201 Created`: Recurso creado exitosamente
- `204 No Content`: Solicitud exitosa sin contenido de respuesta

### Error del Cliente (4xx)
- `400 Bad Request`: Datos de solicitud inválidos
- `401 Unauthorized`: Token de autenticación inválido o faltante
- `403 Forbidden`: Permisos insuficientes para la operación
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto (ej: email ya existe)

### Error del Servidor (5xx)
- `500 Internal Server Error`: Error interno del servidor

---

## 🔑 **AUTENTICACIÓN Y AUTORIZACIÓN**

### JWT Token
- **Formato:** `Bearer <token>`
- **Header:** `Authorization: Bearer <jwt_token>`
- **Expiración:** Configurable en el servidor

### Roles
- **user**: Usuario estándar (permisos básicos)
- **admin**: Administrador (acceso completo)

### Endpoints Públicos
Los siguientes endpoints no requieren autenticación:
- `GET /`
- `POST /auth/register`
- `POST /auth/login`
- `GET /products/*` (todos los endpoints de productos)
- `GET /media/:id`
- `GET /payments/success`
- `GET /payments/cancel`
- `POST /payments/webhook/paypal`

---

## 📝 **NOTAS IMPORTANTES**

1. **Validación de Datos**: Todos los endpoints utilizan DTOs con validaciones usando `class-validator`
2. **MongoDB ObjectIds**: Los IDs deben ser ObjectIds válidos de MongoDB
3. **Uploads**: Los archivos se almacenan en la carpeta `./uploads` del servidor
4. **PayPal Integration**: Los pagos están integrados con PayPal API
5. **Paginación**: Los endpoints de listado soportan paginación con `limit` y `offset`
6. **Timestamps**: Todos los modelos incluyen `createdAt` y `updatedAt` automáticamente
7. **Índices**: La base de datos tiene índices optimizados para búsquedas frecuentes

---

## 🚀 **EJEMPLOS DE USO**

### Registro de Usuario
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "password123",
    "name": "Usuario Ejemplo",
    "street": "Calle 123",
    "city": "Ciudad",
    "zip": "12345",
    "country": "País"
  }'
```

### Obtener Productos
```bash
curl -X GET "http://localhost:3000/products?category=sandalias&minPrice=50"
```

### Agregar al Carrito
```bash
curl -X POST http://localhost:3000/cart/add \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "64a1b2c3d4e5f6789abcdef0",
    "quantity": 2,
    "size": "38"
  }'
```

---

*Documentación generada automáticamente basada en el código fuente del backend Nabra XR1*
