# 📚 Documentación Completa de Endpoints - Backend Nabra XR1

Este documento detalla **TODOS** los endpoints disponibles en la API del backend, incluyendo los nuevos sistemas implementados: **Notificaciones**, **Promociones Expandidas**, **DrEnvío**, y más.

## 🌐 Base URL
```
https://9dbdcf7272a6.ngrok-free.app
```

## 🔐 Autenticación
- **JWT Bearer Token** requerido para la mayoría de endpoints (excepto los marcados como `@Public()`)
- Header: `Authorization: Bearer <token>`
- Roles: `user`, `admin`

---

## 📍 **ENDPOINTS GENERALES**

### GET /
**Descripción:** Endpoint de prueba básico
- **Método:** `GET`
- **URL:** `/`
- **Autenticación:** No requerida
- **Respuesta:** `"Hello World!"`

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
    "access_token": "string",
    "user": {
      "_id": "string",
      "email": "string",
      "name": "string",
      "role": "user"
    }
  }
  ```

### POST /auth/login
**Descripción:** Inicio de sesión
- **Método:** `POST`
- **URL:** `/auth/login`
- **Autenticación:** No requerida (`@Public()`)
- **Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Respuesta:**
  ```json
  {
    "access_token": "string",
    "user": {
      "_id": "string",
      "email": "string",
      "name": "string",
      "role": "string"
    }
  }
  ```

### GET /auth/profile
**Descripción:** Obtener perfil del usuario autenticado
- **Método:** `GET`
- **URL:** `/auth/profile`
- **Autenticación:** Requerida
- **Respuesta:**
  ```json
  {
    "_id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "addresses": [...],
    "createdAt": "string"
  }
  ```

---

## 🔐 **ENDPOINTS DE GOOGLE OAUTH** (`/auth/google`)

### GET /auth/google
**Descripción:** Iniciar autenticación con Google OAuth2
- **Método:** `GET`
- **URL:** `/auth/google`
- **Autenticación:** No requerida (`@Public()`)
- **Respuesta:** Redirección a Google OAuth

### GET /auth/google/callback
**Descripción:** Callback de Google OAuth2
- **Método:** `GET`
- **URL:** `/auth/google/callback`
- **Autenticación:** No requerida (`@Public()`)
- **Respuesta:** Redirección con token JWT

### GET /auth/google/auth-url
**Descripción:** Obtener URL de autenticación de Google
- **Método:** `GET`
- **URL:** `/auth/google/auth-url`
- **Autenticación:** No requerida
- **Query Parameters:**
  - `state`: estado opcional para CSRF protection
- **Respuesta:**
  ```json
  {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "state": "default"
  }
  ```

### GET /auth/google/profile
**Descripción:** Obtener perfil del usuario Google autenticado
- **Método:** `GET`
- **URL:** `/auth/google/profile`
- **Autenticación:** Requerida (Google OAuth)
- **Respuesta:**
  ```json
  {
    "_id": "string",
    "googleId": "string",
    "email": "string",
    "name": "string",
    "firstName": "string",
    "lastName": "string",
    "displayName": "string",
    "avatarUrl": "string",
    "isGoogleUser": true,
    "linkedUserId": "string",
    "access_token": "string",
    "token_type": "Bearer",
    "expires_in": 604800
  }
  ```

### POST /auth/google/link
**Descripción:** Vincular cuenta Google con usuario tradicional
- **Método:** `POST`
- **URL:** `/auth/google/link`
- **Autenticación:** Requerida (Google OAuth)
- **Body:**
  ```json
  {
    "traditionalUserId": "string"
  }
  ```
- **Respuesta:**
  ```json
  {
    "message": "Successfully linked Google account to traditional user",
    "linked": true,
    "user": {
      "_id": "string",
      "googleId": "string",
      "email": "string",
      "name": "string",
      "isGoogleUser": true,
      "linkedUserId": "string"
    }
  }
  ```

### POST /auth/google/unlink
**Descripción:** Desvincular cuenta Google de usuario tradicional
- **Método:** `POST`
- **URL:** `/auth/google/unlink`
- **Autenticación:** Requerida (Google OAuth)
- **Respuesta:**
  ```json
  {
    "message": "Successfully unlinked Google account from traditional user",
    "linked": false,
    "user": {
      "_id": "string",
      "googleId": "string",
      "email": "string",
      "name": "string",
      "isGoogleUser": true,
      "linkedUserId": null
    }
  }
  ```

### POST /auth/google/preferences
**Descripción:** Actualizar preferencias del usuario Google
- **Método:** `POST`
- **URL:** `/auth/google/preferences`
- **Autenticación:** Requerida (Google OAuth)
- **Body:**
  ```json
  {
    "emailNotifications": true,
    "marketingEmails": false,
    "preferredLanguage": "es",
    "timezone": "America/Argentina/Buenos_Aires"
  }
  ```
- **Respuesta:**
  ```json
  {
    "message": "Preferences updated successfully"
  }
  ```

### POST /auth/google/logout
**Descripción:** Cerrar sesión del usuario Google
- **Método:** `POST`
- **URL:** `/auth/google/logout`
- **Autenticación:** Requerida (Google OAuth)
- **Respuesta:**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

### GET /auth/google/profile/complete
**Descripción:** Obtener perfil completo del usuario Google
- **Método:** `GET`
- **URL:** `/auth/google/profile/complete`
- **Autenticación:** Requerida (Google OAuth)
- **Respuesta:**
  ```json
  {
    "success": true,
    "data": {
      "_id": "string",
      "googleId": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "displayName": "string",
      "avatarUrl": "string",
      "phone": "string",
      "alternativeEmail": "string",
      "addresses": [
        {
          "_id": "string",
          "type": "home",
          "street": "string",
          "city": "string",
          "state": "string",
          "zipCode": "string",
          "country": "string",
          "phone": "string",
          "isDefault": true,
          "createdAt": "2025-01-21T10:30:00Z"
        }
      ],
      "preferredShippingMethod": "standard",
      "allowWeekendDelivery": false,
      "allowEveningDelivery": false,
      "requiresInvoice": false,
      "taxId": "string",
      "companyName": "string",
      "emailNotifications": true,
      "orderNotifications": true,
      "shippingNotifications": true,
      "promotionNotifications": true,
      "smsNotifications": false,
      "allowDataProcessing": true,
      "allowMarketingEmails": false,
      "allowDataSharing": false,
      "preferredLanguage": "es",
      "locale": "es-AR",
      "timezone": "America/Argentina/Buenos_Aires",
      "isGoogleUser": true,
      "linkedUserId": "string",
      "createdAt": "2025-01-21T10:30:00Z",
      "lastLoginAt": "2025-01-21T10:30:00Z"
    }
  }
  ```

### PUT /auth/google/profile
**Descripción:** Actualizar perfil completo del usuario Google
- **Método:** `PUT`
- **URL:** `/auth/google/profile`
- **Autenticación:** Requerida (Google OAuth)
- **Body:**
  ```json
  {
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "alternativeEmail": "string",
    "preferredShippingMethod": "standard",
    "allowWeekendDelivery": false,
    "allowEveningDelivery": false,
    "requiresInvoice": false,
    "taxId": "string",
    "companyName": "string",
    "emailNotifications": true,
    "orderNotifications": true,
    "shippingNotifications": true,
    "promotionNotifications": true,
    "smsNotifications": false,
    "allowDataProcessing": true,
    "allowMarketingEmails": false,
    "allowDataSharing": false,
    "preferredLanguage": "es",
    "timezone": "America/Argentina/Buenos_Aires"
  }
  ```

### POST /auth/google/addresses
**Descripción:** Agregar nueva dirección de envío
- **Método:** `POST`
- **URL:** `/auth/google/addresses`
- **Autenticación:** Requerida (Google OAuth)
- **Body:**
  ```json
  {
    "type": "home",
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "1043",
    "country": "Argentina",
    "phone": "+54 11 1234-5678",
    "isDefault": true
  }
  ```

### PUT /auth/google/addresses/:addressId
**Descripción:** Actualizar dirección de envío
- **Método:** `PUT`
- **URL:** `/auth/google/addresses/:addressId`
- **Autenticación:** Requerida (Google OAuth)

### DELETE /auth/google/addresses/:addressId
**Descripción:** Eliminar dirección de envío
- **Método:** `DELETE`
- **URL:** `/auth/google/addresses/:addressId`
- **Autenticación:** Requerida (Google OAuth)

### GET /auth/google/stats
**Descripción:** Obtener estadísticas de usuarios Google (desarrollo)
- **Método:** `GET`
- **URL:** `/auth/google/stats`
- **Autenticación:** Requerida (Google OAuth)
- **Respuesta:**
  ```json
  {
    "success": true,
    "data": {
      "totalUsers": 150,
      "activeUsers": 120,
      "suspendedUsers": 5,
      "averageLoginCount": 12.5
    }
  }
  ```

---

## 📦 **ENDPOINTS DE PRODUCTOS** (`/products`)

### GET /products
**Descripción:** Obtener lista de productos con filtros
- **Método:** `GET`
- **URL:** `/products`
- **Autenticación:** No requerida
- **Query Parameters:**
  - `page`: número de página (default: 1)
  - `limit`: productos por página (default: 10)
  - `category`: filtrar por categoría
  - `search`: búsqueda por nombre
  - `minPrice`: precio mínimo
  - `maxPrice`: precio máximo
  - `sortBy`: campo para ordenar (price, name, createdAt)
  - `sortOrder`: asc/desc
- **Respuesta:**
  ```json
  {
    "products": [...],
    "total": 100,
    "page": 1,
    "totalPages": 10
  }
  ```

### GET /products/:id
**Descripción:** Obtener producto específico
- **Método:** `GET`
- **URL:** `/products/:id`
- **Autenticación:** No requerida
- **Respuesta:**
  ```json
  {
    "_id": "string",
    "name": "string",
    "description": "string",
    "price": 1999.99,
    "category": "string",
    "images": [...],
    "stock": 50,
    "isActive": true
  }
  ```

### POST /products
**Descripción:** Crear nuevo producto (Admin)
- **Método:** `POST`
- **URL:** `/products`
- **Autenticación:** Requerida (Admin)
- **Body:**
  ```json
  {
    "name": "string",
    "description": "string",
    "price": 1999.99,
    "category": "string",
    "stock": 50,
    "images": ["url1", "url2"]
  }
  ```

### PUT /products/:id
**Descripción:** Actualizar producto (Admin)
- **Método:** `PUT`
- **URL:** `/products/:id`
- **Autenticación:** Requerida (Admin)

### DELETE /products/:id
**Descripción:** Eliminar producto (Admin)
- **Método:** `DELETE`
- **URL:** `/products/:id`
- **Autenticación:** Requerida (Admin)

---

## 🛒 **ENDPOINTS DE CARRITO** (`/cart`)

### GET /cart
**Descripción:** Obtener carrito del usuario
- **Método:** `GET`
- **URL:** `/cart`
- **Autenticación:** Requerida
- **Respuesta:**
  ```json
  {
    "items": [
      {
        "_id": "string",
        "productId": "string",
        "productName": "string",
        "quantity": 2,
        "price": 1999.99,
        "size": "M",
        "color": "Azul"
      }
    ],
    "total": 3999.98,
    "totalItems": 2
  }
  ```

### POST /cart/add
**Descripción:** Agregar producto al carrito
- **Método:** `POST`
- **URL:** `/cart/add`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "productId": "string",
    "quantity": 2,
    "size": "M",
    "color": "Azul"
  }
  ```

### PUT /cart/:itemId
**Descripción:** Actualizar cantidad de item en carrito
- **Método:** `PUT`
- **URL:** `/cart/:itemId`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "quantity": 3
  }
  ```

### DELETE /cart/:itemId
**Descripción:** Eliminar item del carrito
- **Método:** `DELETE`
- **URL:** `/cart/:itemId`
- **Autenticación:** Requerida

### GET /cart/summary-with-discounts
**Descripción:** Obtener resumen del carrito con descuentos aplicados
- **Método:** `GET`
- **URL:** `/cart/summary-with-discounts`
- **Autenticación:** Requerida
- **Query Parameters:**
  - `couponCode`: código de cupón opcional
- **Respuesta:**
  ```json
  {
    "items": [...],
    "subtotal": 3999.98,
    "discounts": [
      {
        "type": "percentage",
        "amount": 799.99,
        "description": "20% OFF"
      }
    ],
    "total": 3200.00,
    "shipping": 500.00,
    "finalTotal": 3700.00
  }
  ```

---

## 🎁 **ENDPOINTS DE PROMOCIONES** (`/promotions`)

### GET /promotions/active
**Descripción:** Obtener promociones activas
- **Método:** `GET`
- **URL:** `/promotions/active`
- **Autenticación:** No requerida
- **Query Parameters:**
  - `type`: tipo de promoción
  - `category`: categoría específica
- **Respuesta:**
  ```json
  {
    "promotions": [
      {
        "_id": "string",
        "name": "string",
        "type": "percentage",
        "description": "string",
        "discountPercentage": 20,
        "startDate": "2025-01-21T00:00:00Z",
        "endDate": "2025-01-31T23:59:59Z"
      }
    ]
  }
  ```

### GET /promotions/types
**Descripción:** Obtener todos los tipos de promociones disponibles
- **Método:** `GET`
- **URL:** `/promotions/types`
- **Autenticación:** No requerida
- **Respuesta:**
  ```json
  {
    "types": [
      {
        "id": "percentage",
        "name": "Descuento Porcentual",
        "description": "Descuento por porcentaje"
      },
      {
        "id": "pay_x_get_y",
        "name": "Pagar X y Llevar Y",
        "description": "Pagas X cantidad y te llevas Y cantidad"
      },
      {
        "id": "progressive_quantity_discount",
        "name": "Descuento Progresivo",
        "description": "Descuentos progresivos por cantidad"
      }
    ]
  }
  ```

### POST /promotions/apply-discounts
**Descripción:** Calcular descuentos para carrito
- **Método:** `POST`
- **URL:** `/promotions/apply-discounts`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "couponCode": "SAVE20",
    "cartItems": [
      {
        "productId": "string",
        "cartItemId": "string",
        "productName": "string",
        "category": "string",
        "quantity": 2,
        "price": 1999.99,
        "size": "M"
      }
    ],
    "totalAmount": 3999.98
  }
  ```
- **Respuesta:**
  ```json
  {
    "discounts": [
      {
        "promotionId": "string",
        "promotionName": "string",
        "type": "percentage",
        "discountAmount": 799.99,
        "appliedToItems": ["product_id"],
        "description": "20% OFF"
      }
    ],
    "totalDiscount": 799.99,
    "finalAmount": 3200.00
  }
  ```

### POST /promotions/apply-to-cart
**Descripción:** Aplicar promociones automáticamente al carrito
- **Método:** `POST`
- **URL:** `/promotions/apply-to-cart`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "productId": "string",
    "quantity": 2,
    "price": 1999.99
  }
  ```
- **Respuesta:**
  ```json
  {
    "updates": [
      {
        "userId": "string",
        "productId": "string",
        "promotionId": "string",
        "promotionName": "string",
        "discountAmount": 400.00,
        "originalPrice": 3999.98,
        "discountedPrice": 3599.98,
        "appliedAt": "2025-01-21T10:30:00Z"
      }
    ]
  }
  ```

### GET /promotions/user-eligible
**Descripción:** Obtener promociones elegibles para el usuario
- **Método:** `GET`
- **URL:** `/promotions/user-eligible`
- **Autenticación:** Requerida
- **Respuesta:**
  ```json
  {
    "promotions": [
      {
        "_id": "string",
        "name": "string",
        "type": "first_purchase_discount",
        "discountPercentage": 30,
        "description": "Descuento por primera compra"
      }
    ]
  }
  ```

### POST /promotions/validate-coupon
**Descripción:** Validar cupón sin aplicarlo
- **Método:** `POST`
- **URL:** `/promotions/validate-coupon`
- **Autenticación:** No requerida
- **Body:**
  ```json
  {
    "couponCode": "SAVE20",
    "userId": "string"
  }
  ```
- **Respuesta:**
  ```json
  {
    "valid": true,
    "coupon": {
      "code": "SAVE20",
      "discountPercentage": 20,
      "validUntil": "2025-12-31T23:59:59Z"
    },
    "message": "Cupón válido"
  }
  ```

### GET /promotions/coupons/public
**Descripción:** Obtener cupones públicos disponibles
- **Método:** `GET`
- **URL:** `/promotions/coupons/public`
- **Autenticación:** No requerida

### GET /promotions/category/:category
**Descripción:** Promociones específicas de una categoría
- **Método:** `GET`
- **URL:** `/promotions/category/:category`
- **Autenticación:** No requerida

### GET /promotions/product/:productId
**Descripción:** Promociones específicas de un producto
- **Método:** `GET`
- **URL:** `/promotions/product/:productId`
- **Autenticación:** No requerida

### POST /promotions (Admin)
**Descripción:** Crear nueva promoción
- **Método:** `POST`
- **URL:** `/promotions`
- **Autenticación:** Requerida (Admin)
- **Body:**
  ```json
  {
    "name": "3x2 en Remeras",
    "type": "pay_x_get_y",
    "target": "specific_products",
    "startDate": "2025-01-21T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z",
    "conditions": {
      "specificProducts": ["product_id_1", "product_id_2"],
      "minimumQuantity": 2
    },
    "rules": {
      "payQuantity": 2,
      "getTotalQuantity": 3
    },
    "autoApplyToCart": true,
    "retroactiveApplication": true,
    "notifyCartUsers": true,
    "priority": 8
  }
  ```

### POST /promotions/bulk (Admin)
**Descripción:** Crear promoción masiva
- **Método:** `POST`
- **URL:** `/promotions/bulk`
- **Autenticación:** Requerida (Admin)

### POST /promotions/segment (Admin)
**Descripción:** Crear promoción para segmento
- **Método:** `POST`
- **URL:** `/promotions/segment`
- **Autenticación:** Requerida (Admin)

### POST /promotions/:id/apply-retroactive (Admin)
**Descripción:** Aplicar promoción retroactivamente a carritos existentes
- **Método:** `POST`
- **URL:** `/promotions/:id/apply-retroactive`
- **Autenticación:** Requerida (Admin)

### GET /promotions/admin/stats (Admin)
**Descripción:** Estadísticas de promociones
- **Método:** `GET`
- **URL:** `/promotions/admin/stats`
- **Autenticación:** Requerida (Admin)

---

## 📧 **ENDPOINTS DE NOTIFICACIONES** (`/notifications`)

### GET /notifications
**Descripción:** Obtener notificaciones del usuario
- **Método:** `GET`
- **URL:** `/notifications`
- **Autenticación:** Requerida
- **Query Parameters:**
  - `limit`: número de notificaciones (default: 10)
  - `offset`: offset para paginación (default: 0)
  - `status`: filtrar por estado (pending, sent, delivered, read, failed)
  - `type`: filtrar por tipo de notificación
- **Respuesta:**
  ```json
  {
    "notifications": [
      {
        "_id": "string",
        "type": "order_confirmed",
        "channel": "email",
        "title": "¡Pedido confirmado!",
        "content": "Tu pedido #12345 ha sido confirmado",
        "status": "delivered",
        "priority": "medium",
        "createdAt": "2025-01-21T10:30:00Z",
        "readAt": null,
        "isRead": false
      }
    ],
    "total": 25
  }
  ```

### GET /notifications/unread-count
**Descripción:** Obtener contador de notificaciones no leídas
- **Método:** `GET`
- **URL:** `/notifications/unread-count`
- **Autenticación:** Requerida
- **Respuesta:**
  ```json
  {
    "count": 5
  }
  ```

### PUT /notifications/:id/read
**Descripción:** Marcar notificación como leída
- **Método:** `PUT`
- **URL:** `/notifications/:id/read`
- **Autenticación:** Requerida
- **Respuesta:** 204 No Content

### PUT /notifications/read-all
**Descripción:** Marcar todas las notificaciones como leídas
- **Método:** `PUT`
- **URL:** `/notifications/read-all`
- **Autenticación:** Requerida
- **Respuesta:** 204 No Content

### GET /notifications/preferences
**Descripción:** Obtener preferencias de notificaciones del usuario
- **Método:** `GET`
- **URL:** `/notifications/preferences`
- **Autenticación:** Requerida
- **Respuesta:**
  ```json
  {
    "userId": "string",
    "preferences": {
      "order_confirmed": "all_channels",
      "order_shipped": ["email", "push"],
      "promotion": "email"
    },
    "channelSettings": {
      "emailEnabled": true,
      "smsEnabled": false,
      "pushEnabled": true,
      "inAppEnabled": true,
      "quietHoursStart": "22:00",
      "quietHoursEnd": "08:00"
    },
    "allowMarketing": true,
    "allowTransactional": true,
    "language": "es",
    "timezone": "America/Argentina/Buenos_Aires"
  }
  ```

### PUT /notifications/preferences
**Descripción:** Actualizar preferencias de notificaciones
- **Método:** `PUT`
- **URL:** `/notifications/preferences`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "preferences": {
      "order_confirmed": "email",
      "promotion": "none"
    },
    "channelSettings": {
      "emailEnabled": true,
      "smsEnabled": false
    },
    "allowMarketing": false
  }
  ```

### POST /notifications (Admin)
**Descripción:** Crear notificación
- **Método:** `POST`
- **URL:** `/notifications`
- **Autenticación:** Requerida (Admin)
- **Body:**
  ```json
  {
    "userId": "string",
    "type": "promotion",
    "channel": "email",
    "title": "¡Nueva promoción!",
    "content": "Tienes una nueva promoción disponible",
    "data": {
      "promotionId": "string",
      "discountPercentage": 20
    },
    "priority": "medium",
    "scheduledFor": "2025-01-21T15:00:00Z"
  }
  ```

### POST /notifications/bulk (Admin)
**Descripción:** Crear notificación masiva
- **Método:** `POST`
- **URL:** `/notifications/bulk`
- **Autenticación:** Requerida (Admin)

### POST /notifications/segment (Admin)
**Descripción:** Crear notificación para segmento
- **Método:** `POST`
- **URL:** `/notifications/segment`
- **Autenticación:** Requerida (Admin)

### GET /notifications/admin/stats (Admin)
**Descripción:** Estadísticas de notificaciones
- **Método:** `GET`
- **URL:** `/notifications/admin/stats`
- **Autenticación:** Requerida (Admin)

### POST /notifications/webhook/delivery (Webhook)
**Descripción:** Webhook para actualizaciones de entrega
- **Método:** `POST`
- **URL:** `/notifications/webhook/delivery`
- **Autenticación:** No requerida (`@Public()`)

### POST /notifications/webhook/opened (Webhook)
**Descripción:** Webhook para emails abiertos
- **Método:** `POST`
- **URL:** `/notifications/webhook/opened`
- **Autenticación:** No requerida (`@Public()`)

### POST /notifications/webhook/clicked (Webhook)
**Descripción:** Webhook para clicks en emails
- **Método:** `POST`
- **URL:** `/notifications/webhook/clicked`
- **Autenticación:** No requerida (`@Public()`)

### GET /notifications/unsubscribe/:token
**Descripción:** Desuscribirse de notificaciones
- **Método:** `GET`
- **URL:** `/notifications/unsubscribe/:token`
- **Autenticación:** No requerida (`@Public()`)

---

## 🚚 **ENDPOINTS DE ENVÍOS** (`/shipping`)

### POST /shipping/calculate
**Descripción:** Calcular opciones de envío
- **Método:** `POST`
- **URL:** `/shipping/calculate`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "addressId": "string",
    "cartItems": [
      {
        "productId": "string",
        "quantity": 2
      }
    ]
  }
  ```
- **Respuesta:**
  ```json
  {
    "options": [
      {
        "service": "standard",
        "name": "Envío Estándar",
        "cost": 500.00,
        "estimatedDays": 3,
        "description": "Entrega en 3-5 días hábiles"
      },
      {
        "service": "express",
        "name": "Envío Express",
        "cost": 800.00,
        "estimatedDays": 1,
        "description": "Entrega en 24-48 horas"
      }
    ]
  }
  ```

### POST /shipping/calculate/cart
**Descripción:** Calcular envío desde carrito actual
- **Método:** `POST`
- **URL:** `/shipping/calculate/cart`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "addressId": "string",
    "service": "standard"
  }
  ```

### GET /shipping/quote/:addressId
**Descripción:** Obtener cotización rápida
- **Método:** `GET`
- **URL:** `/shipping/quote/:addressId`
- **Autenticación:** Requerida

### GET /shipping/services
**Descripción:** Obtener servicios de envío disponibles
- **Método:** `GET`
- **URL:** `/shipping/services`
- **Autenticación:** No requerida
- **Query Parameters:**
  - `zone`: zona de entrega (CABA, GBA, INTERIOR)
- **Respuesta:**
  ```json
  {
    "services": [
      {
        "id": "standard",
        "name": "Envío Estándar",
        "description": "Entrega en 3-5 días hábiles",
        "features": ["Seguimiento incluido", "Entrega en domicilio"],
        "maxWeight": 30,
        "maxDimensions": {
          "length": 100,
          "width": 100,
          "height": 100
        },
        "availableIn": ["CABA", "GBA", "INTERIOR"]
      }
    ]
  }
  ```

### GET /shipping/coverage
**Descripción:** Obtener información de cobertura
- **Método:** `GET`
- **URL:** `/shipping/coverage`
- **Autenticación:** No requerida

### GET /shipping/tracking/:trackingNumber
**Descripción:** Obtener información de seguimiento
- **Método:** `GET`
- **URL:** `/shipping/tracking/:trackingNumber`
- **Autenticación:** Requerida
- **Respuesta:**
  ```json
  {
    "trackingNumber": "string",
    "status": "in_transit",
    "estimatedDelivery": "2025-01-25T18:00:00Z",
    "history": [
      {
        "timestamp": "2025-01-21T10:30:00Z",
        "status": "created",
        "description": "Envío creado",
        "location": "Centro de distribución"
      },
      {
        "timestamp": "2025-01-22T08:15:00Z",
        "status": "in_transit",
        "description": "En tránsito",
        "location": "CABA"
      }
    ]
  }
  ```

### GET /shipping/delivery-estimate
**Descripción:** Obtener estimación de entrega
- **Método:** `GET`
- **URL:** `/shipping/delivery-estimate`
- **Autenticación:** No requerida
- **Query Parameters:**
  - `service`: tipo de servicio
  - `zone`: zona de destino
- **Respuesta:**
  ```json
  {
    "service": "standard",
    "zone": "CABA",
    "estimatedDays": 3,
    "estimatedDate": "2025-01-25T18:00:00Z",
    "businessDays": true
  }
  ```

### POST /shipping/create (Admin)
**Descripción:** Crear envío
- **Método:** `POST`
- **URL:** `/shipping/create`
- **Autenticación:** Requerida (Admin)

### GET /shipping/admin/shipments (Admin)
**Descripción:** Obtener todos los envíos (Admin)
- **Método:** `GET`
- **URL:** `/shipping/admin/shipments`
- **Autenticación:** Requerida (Admin)

### POST /shipping/webhook/status (Webhook)
**Descripción:** Webhook para actualizaciones de estado
- **Método:** `POST`
- **URL:** `/shipping/webhook/status`
- **Autenticación:** No requerida (`@Public()`)

---

## 💳 **ENDPOINTS DE PAGOS** (`/payments`)

### POST /payments/create-order
**Descripción:** Crear orden de pago PayPal
- **Método:** `POST`
- **URL:** `/payments/create-order`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "cartItems": [
      {
        "productId": "string",
        "quantity": 2,
        "price": 1999.99
      }
    ],
    "shippingCost": 500.00,
    "couponCode": "SAVE20"
  }
  ```
- **Respuesta:**
  ```json
  {
    "orderId": "string",
    "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=...",
    "amount": {
      "total": 3700.00,
      "currency": "USD"
    }
  }
  ```

### POST /payments/capture-order
**Descripción:** Capturar pago aprobado
- **Método:** `POST`
- **URL:** `/payments/capture-order`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "orderId": "string",
    "paymentId": "string",
    "payerId": "string"
  }
  ```

### POST /payments/cancel-order
**Descripción:** Cancelar orden de pago
- **Método:** `POST`
- **URL:** `/payments/cancel-order`
- **Autenticación:** Requerida

### GET /payments/order/:orderId
**Descripción:** Obtener detalles de orden de pago
- **Método:** `GET`
- **URL:** `/payments/order/:orderId`
- **Autenticación:** Requerida

### POST /payments/webhook
**Descripción:** Webhook de PayPal
- **Método:** `POST`
- **URL:** `/payments/webhook`
- **Autenticación:** No requerida (`@Public()`)

---

## 📋 **ENDPOINTS DE ÓRDENES** (`/orders`)

### GET /orders
**Descripción:** Obtener órdenes del usuario
- **Método:** `GET`
- **URL:** `/orders`
- **Autenticación:** Requerida
- **Query Parameters:**
  - `page`: página (default: 1)
  - `limit`: órdenes por página (default: 10)
  - `status`: filtrar por estado
- **Respuesta:**
  ```json
  {
    "orders": [
      {
        "_id": "string",
        "orderNumber": "ORD-001",
        "status": "completed",
        "total": 3700.00,
        "items": [...],
        "shippingAddress": {...},
        "paymentStatus": "completed",
        "createdAt": "2025-01-21T10:30:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "totalPages": 2
  }
  ```

### GET /orders/:id
**Descripción:** Obtener orden específica
- **Método:** `GET`
- **URL:** `/orders/:id`
- **Autenticación:** Requerida

### POST /orders
**Descripción:** Crear nueva orden
- **Método:** `POST`
- **URL:** `/orders`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "cartItems": [...],
    "shippingAddressId": "string",
    "paymentMethod": "paypal",
    "couponCode": "SAVE20"
  }
  ```

### PUT /orders/:id/cancel
**Descripción:** Cancelar orden
- **Método:** `PUT`
- **URL:** `/orders/:id/cancel`
- **Autenticación:** Requerida

### GET /orders/admin/orders (Admin)
**Descripción:** Obtener todas las órdenes (Admin)
- **Método:** `GET`
- **URL:** `/orders/admin/orders`
- **Autenticación:** Requerida (Admin)

### PUT /orders/admin/:id/status (Admin)
**Descripción:** Actualizar estado de orden (Admin)
- **Método:** `PUT`
- **URL:** `/orders/admin/:id/status`
- **Autenticación:** Requerida (Admin)

---

## ⭐ **ENDPOINTS DE RESEÑAS** (`/reviews`)

### GET /reviews/product/:productId
**Descripción:** Obtener reseñas de un producto
- **Método:** `GET`
- **URL:** `/reviews/product/:productId`
- **Autenticación:** No requerida
- **Query Parameters:**
  - `page`: página (default: 1)
  - `limit`: reseñas por página (default: 10)
  - `rating`: filtrar por calificación (1-5)
- **Respuesta:**
  ```json
  {
    "reviews": [
      {
        "_id": "string",
        "userId": "string",
        "userName": "Juan Pérez",
        "rating": 5,
        "comment": "Excelente producto",
        "isVerified": true,
        "createdAt": "2025-01-21T10:30:00Z"
      }
    ],
    "averageRating": 4.5,
    "totalReviews": 25,
    "ratingDistribution": {
      "5": 15,
      "4": 7,
      "3": 2,
      "2": 1,
      "1": 0
    }
  }
  ```

### POST /reviews
**Descripción:** Crear reseña
- **Método:** `POST`
- **URL:** `/reviews`
- **Autenticación:** Requerida
- **Body:**
  ```json
  {
    "productId": "string",
    "orderId": "string",
    "rating": 5,
    "comment": "Excelente producto, muy recomendado",
    "photos": ["url1", "url2"]
  }
  ```

### PUT /reviews/:id
**Descripción:** Actualizar reseña
- **Método:** `PUT`
- **URL:** `/reviews/:id`
- **Autenticación:** Requerida

### DELETE /reviews/:id
**Descripción:** Eliminar reseña
- **Método:** `DELETE`
- **URL:** `/reviews/:id`
- **Autenticación:** Requerida

### POST /reviews/:id/like
**Descripción:** Dar like a reseña
- **Método:** `POST`
- **URL:** `/reviews/:id/like`
- **Autenticación:** Requerida

### GET /reviews/admin/reviews (Admin)
**Descripción:** Obtener todas las reseñas (Admin)
- **Método:** `GET`
- **URL:** `/reviews/admin/reviews`
- **Autenticación:** Requerida (Admin)

### PUT /reviews/admin/:id/moderate (Admin)
**Descripción:** Moderar reseña (Admin)
- **Método:** `PUT`
- **URL:** `/reviews/admin/:id/moderate`
- **Autenticación:** Requerida (Admin)

---

## 👑 **ENDPOINTS DE ADMINISTRACIÓN** (`/admin`)

### GET /admin/dashboard
**Descripción:** Obtener datos del dashboard de administración
- **Método:** `GET`
- **URL:** `/admin/dashboard`
- **Autenticación:** Requerida (Admin)
- **Respuesta:**
  ```json
  {
    "stats": {
      "totalOrders": 1250,
      "totalRevenue": 125000.00,
      "totalUsers": 850,
      "totalProducts": 150,
      "pendingOrders": 25,
      "lowStockProducts": 8
    },
    "recentOrders": [...],
    "topProducts": [...],
    "salesChart": {
      "labels": ["Ene", "Feb", "Mar"],
      "data": [10000, 15000, 20000]
    }
  }
  ```

### GET /admin/products
**Descripción:** Gestión de productos (Admin)
- **Método:** `GET`
- **URL:** `/admin/products`
- **Autenticación:** Requerida (Admin)

### GET /admin/users
**Descripción:** Gestión de usuarios (Admin)
- **Método:** `GET`
- **URL:** `/admin/users`
- **Autenticación:** Requerida (Admin)

### GET /admin/orders
**Descripción:** Gestión de órdenes (Admin)
- **Método:** `GET`
- **URL:** `/admin/orders`
- **Autenticación:** Requerida (Admin)

### GET /admin/reviews
**Descripción:** Gestión de reseñas (Admin)
- **Método:** `GET`
- **URL:** `/admin/reviews`
- **Autenticación:** Requerida (Admin)

### GET /admin/promotions
**Descripción:** Gestión de promociones (Admin)
- **Método:** `GET`
- **URL:** `/admin/promotions`
- **Autenticación:** Requerida (Admin)

### GET /admin/analytics
**Descripción:** Analytics avanzados (Admin)
- **Método:** `GET`
- **URL:** `/admin/analytics`
- **Autenticación:** Requerida (Admin)

---

## 📊 **CÓDIGOS DE RESPUESTA HTTP**

### ✅ **Éxito**
- `200 OK` - Solicitud exitosa
- `201 Created` - Recurso creado exitosamente
- `204 No Content` - Operación exitosa sin contenido

### ❌ **Errores del Cliente**
- `400 Bad Request` - Solicitud inválida
- `401 Unauthorized` - No autenticado
- `403 Forbidden` - Sin permisos
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto (ej: email duplicado)
- `422 Unprocessable Entity` - Datos de validación incorrectos

### 🔧 **Errores del Servidor**
- `500 Internal Server Error` - Error interno del servidor
- `503 Service Unavailable` - Servicio no disponible

---

## 📝 **FORMATOS DE RESPUESTA**

### **Respuesta de Éxito**
```json
{
  "success": true,
  "data": {...},
  "message": "Operación exitosa"
}
```

### **Respuesta de Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos de entrada inválidos",
    "details": [
      {
        "field": "email",
        "message": "El email es requerido"
      }
    ]
  },
  "timestamp": "2025-01-21T10:30:00Z"
}
```

### **Respuesta Paginada**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 🔒 **SEGURIDAD**

### **Headers Requeridos**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### **Rate Limiting**
- **Usuarios autenticados**: 1000 requests/hora
- **Usuarios no autenticados**: 100 requests/hora
- **Endpoints de admin**: 5000 requests/hora

### **Validación de Datos**
- Todos los inputs son validados usando class-validator
- Sanitización automática de datos
- Protección contra inyección SQL/NoSQL

---

## 📚 **DOCUMENTACIÓN ADICIONAL**

- **Notificaciones**: `NOTIFICATIONS_SYSTEM_DOCUMENTATION.md`
- **Promociones**: `PROMOTIONS_EXPANDED_DOCUMENTATION.md`
- **DrEnvío**: `DRENVIO_INTEGRATION.md`
- **PayPal**: `PAYMENT_API.md`
- **Reseñas**: `REVIEWS_SYSTEM_DOCUMENTATION.md`

---

## 🚀 **PRÓXIMAS FUNCIONALIDADES**

- **Sistema de Wishlist** - Lista de deseos
- **Motor de Recomendaciones** - IA para sugerir productos
- **Dashboard de Analytics** - Reportes avanzados
- **A/B Testing** - Pruebas de promociones
- **Gamificación** - Sistema de puntos y recompensas

---

**Última actualización**: 21 de Enero, 2025  
**Versión de API**: v1.0.0  
**Total de endpoints**: 110+ endpoints implementados