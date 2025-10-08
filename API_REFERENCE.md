# API Reference Documentation

## Base URL
```
http://localhost:3001
```

## Authentication
Most endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All responses follow this structure:
```json
{
  "success": true|false,
  "data": {...},
  "message": "string",
  "error": {...} // only on errors
}
```

---

# Authentication Endpoints

## Traditional Authentication

### POST /auth/register
**Purpose**: Register a new user with email and password  
**Authentication**: None required  
**URL**: `http://localhost:3001/auth/register`  

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Success Response (201)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "Email already exists",
  "error": "DUPLICATE_EMAIL"
}
```

### POST /auth/login
**Purpose**: Authenticate user with email and password  
**Authentication**: None required  
**URL**: `http://localhost:3001/auth/login`  

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

**Error Response (401)**:
```json
{
  "success": false,
  "message": "Invalid credentials",
  "error": "INVALID_CREDENTIALS"
}
```

### GET /auth/profile
**Purpose**: Get authenticated user's profile information  
**Authentication**: Required  
**URL**: `http://localhost:3001/auth/profile`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "phone": "+54 11 1234-5678",
  "addresses": [
    {
      "_id": "addr_001",
      "type": "home",
      "street": "Av. Corrientes 1234",
      "city": "Buenos Aires",
      "state": "CABA",
      "zipCode": "1043",
      "country": "Argentina",
      "isDefault": true
    }
  ],
  "preferredShippingMethod": "standard",
  "emailNotifications": true,
  "orderNotifications": true,
  "preferredLanguage": "es",
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

## User Profile Management

### GET /profile/complete
**Purpose**: Get complete user profile with all configurable data  
**Authentication**: Required  
**URL**: `http://localhost:3001/profile/complete`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+54 11 1234-5678",
  "alternativeEmail": "john.personal@gmail.com",
  "addresses": [
    {
      "_id": "addr_001",
      "type": "home",
      "street": "Av. Corrientes 1234",
      "city": "Buenos Aires",
      "state": "CABA",
      "zipCode": "1043",
      "country": "Argentina",
      "phone": "+54 11 1234-5678",
      "isDefault": true,
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "preferredShippingMethod": "standard",
  "allowWeekendDelivery": false,
  "allowEveningDelivery": false,
  "requiresInvoice": false,
  "taxId": "20-12345678-9",
  "companyName": "Mi Empresa SRL",
  "emailNotifications": true,
  "orderNotifications": true,
  "shippingNotifications": true,
  "promotionNotifications": true,
  "smsNotifications": false,
  "allowDataProcessing": true,
  "allowMarketingEmails": false,
  "allowDataSharing": false,
  "preferredLanguage": "es",
  "timezone": "America/Argentina/Buenos_Aires",
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

### PUT /profile
**Purpose**: Update user's profile information  
**Authentication**: Required  
**URL**: `http://localhost:3001/profile`  

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+54 11 1234-5678",
  "alternativeEmail": "john.personal@gmail.com",
  "preferredShippingMethod": "express",
  "allowWeekendDelivery": true,
  "allowEveningDelivery": false,
  "requiresInvoice": true,
  "taxId": "20-12345678-9",
  "companyName": "Mi Empresa SRL",
  "emailNotifications": true,
  "orderNotifications": true,
  "shippingNotifications": true,
  "promotionNotifications": false,
  "smsNotifications": true,
  "allowDataProcessing": true,
  "allowMarketingEmails": false,
  "allowDataSharing": false,
  "preferredLanguage": "es",
  "timezone": "America/Argentina/Buenos_Aires"
}
```

**Success Response (200)**:
```json
{
  "message": "Profile updated successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+54 11 1234-5678",
    "alternativeEmail": "john.personal@gmail.com",
    "preferredShippingMethod": "express",
    "emailNotifications": true,
    "smsNotifications": true,
    "updatedAt": "2025-01-21T11:30:00.000Z"
  }
}
```

### POST /profile/addresses
**Purpose**: Add a new shipping address for user  
**Authentication**: Required  
**URL**: `http://localhost:3001/profile/addresses`  

**Request Body**:
```json
{
  "type": "work",
  "street": "Av. Santa Fe 5678",
  "city": "Buenos Aires",
  "state": "CABA",
  "zipCode": "1425",
  "country": "Argentina",
  "phone": "+54 11 9876-5432",
  "isDefault": false
}
```

**Success Response (201)**:
```json
{
  "message": "Address added successfully",
  "address": {
    "_id": "addr_002",
    "type": "work",
    "street": "Av. Santa Fe 5678",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "1425",
    "country": "Argentina",
    "phone": "+54 11 9876-5432",
    "isDefault": false,
    "createdAt": "2025-01-21T10:30:00.000Z"
  }
}
```

### PUT /profile/addresses/:addressId
**Purpose**: Update an existing shipping address  
**Authentication**: Required  
**URL**: `http://localhost:3001/profile/addresses/addr_002`  

**Request Body**:
```json
{
  "street": "Av. Santa Fe 9999",
  "phone": "+54 11 9999-8888",
  "isDefault": true
}
```

**Success Response (200)**:
```json
{
  "message": "Address updated successfully",
  "address": {
    "_id": "addr_002",
    "type": "work",
    "street": "Av. Santa Fe 9999",
    "phone": "+54 11 9999-8888",
    "isDefault": true,
    "updatedAt": "2025-01-21T11:30:00.000Z"
  }
}
```

### DELETE /profile/addresses/:addressId
**Purpose**: Delete a shipping address  
**Authentication**: Required  
**URL**: `http://localhost:3001/profile/addresses/addr_002`  

**Success Response (200)**:
```json
{
  "message": "Address deleted successfully"
}
```

### GET /profile/addresses
**Purpose**: Get all user's shipping addresses  
**Authentication**: Required  
**URL**: `http://localhost:3001/profile/addresses`  

**Success Response (200)**:
```json
{
  "addresses": [
    {
      "_id": "addr_001",
      "type": "home",
      "street": "Av. Corrientes 1234",
      "city": "Buenos Aires",
      "state": "CABA",
      "zipCode": "1043",
      "country": "Argentina",
      "phone": "+54 11 1234-5678",
      "isDefault": true,
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ]
}
```

## Google OAuth Authentication

### GET /auth/google
**Purpose**: Initiate Google OAuth authentication flow  
**Authentication**: None required  
**URL**: `http://localhost:3001/auth/google`  

**Response**: Redirects to Google OAuth consent screen

### GET /auth/google/callback
**Purpose**: Handle Google OAuth callback (used internally)  
**Authentication**: None required  
**URL**: `http://localhost:3001/auth/google/callback`  

**Response**: Redirects to frontend with token and user data

### GET /auth/google/auth-url
**Purpose**: Get Google OAuth authorization URL for frontend integration  
**Authentication**: None required  
**URL**: `http://localhost:3001/auth/google/auth-url`  

**Query Parameters**:
- `state` (optional): CSRF protection state parameter

**Success Response (200)**:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "default"
}
```

### GET /auth/google/profile
**Purpose**: Get Google user's profile information  
**Authentication**: Required (Google OAuth)  
**URL**: `http://localhost:3001/auth/google/profile`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "googleId": "1234567890",
  "email": "user@gmail.com",
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "displayName": "John Doe",
  "avatarUrl": "https://lh3.googleusercontent.com/...",
  "isGoogleUser": true,
  "linkedUserId": null,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 604800
}
```

### GET /auth/google/profile/complete
**Purpose**: Get complete Google user profile with all configurable data  
**Authentication**: Required (Google OAuth)  
**URL**: `http://localhost:3001/auth/google/profile/complete`  

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "googleId": "1234567890",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+54 11 1234-5678",
    "addresses": [
      {
        "_id": "addr_001",
        "type": "home",
        "street": "Av. Corrientes 1234",
        "city": "Buenos Aires",
        "state": "CABA",
        "zipCode": "1043",
        "country": "Argentina",
        "isDefault": true
      }
    ],
    "preferredShippingMethod": "standard",
    "emailNotifications": true,
    "smsNotifications": false,
    "preferredLanguage": "es"
  }
}
```

### PUT /auth/google/profile
**Purpose**: Update Google user's profile information  
**Authentication**: Required (Google OAuth)  
**URL**: `http://localhost:3001/auth/google/profile`  

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+54 11 1234-5678",
  "preferredShippingMethod": "express",
  "emailNotifications": true,
  "smsNotifications": false,
  "preferredLanguage": "es"
}
```

**Success Response (200)**:
```json
{
  "message": "Profile updated successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+54 11 1234-5678"
  }
}
```

### POST /auth/google/addresses
**Purpose**: Add a new shipping address for Google user  
**Authentication**: Required (Google OAuth)  
**URL**: `http://localhost:3001/auth/google/addresses`  

**Request Body**:
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

**Success Response (201)**:
```json
{
  "message": "Address added successfully",
  "address": {
    "_id": "addr_002",
    "type": "home",
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "1043",
    "country": "Argentina",
    "phone": "+54 11 1234-5678",
    "isDefault": true,
    "createdAt": "2025-01-21T10:30:00.000Z"
  }
}
```

### PUT /auth/google/addresses/:addressId
**Purpose**: Update an existing shipping address  
**Authentication**: Required (Google OAuth)  
**URL**: `http://localhost:3001/auth/google/addresses/addr_002`  

**Request Body**:
```json
{
  "street": "Av. Santa Fe 5678",
  "isDefault": false
}
```

**Success Response (200)**:
```json
{
  "message": "Address updated successfully",
  "address": {
    "_id": "addr_002",
    "street": "Av. Santa Fe 5678",
    "isDefault": false
  }
}
```

### DELETE /auth/google/addresses/:addressId
**Purpose**: Delete a shipping address  
**Authentication**: Required (Google OAuth)  
**URL**: `http://localhost:3001/auth/google/addresses/addr_002`  

**Success Response (200)**:
```json
{
  "message": "Address deleted successfully"
}
```

---

# Product Management Endpoints

### GET /products
**Purpose**: Get list of products with optional filtering and pagination  
**Authentication**: None required  
**URL**: `http://localhost:3001/products`  

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category
- `search` (string): Search in product name/description
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort field (price, name, createdAt)
- `sortOrder` (string): Sort direction (asc, desc)

**Success Response (200)**:
```json
{
  "products": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Wireless Headphones",
      "description": "High-quality wireless headphones with noise cancellation",
      "price": 1999.99,
      "category": "Electronics",
      "images": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "stock": 50,
      "isActive": true,
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

### GET /products/:id
**Purpose**: Get detailed information about a specific product  
**Authentication**: None required  
**URL**: `http://localhost:3001/products/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "price": 1999.99,
  "category": "Electronics",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "stock": 50,
  "isActive": true,
  "specifications": {
    "brand": "TechBrand",
    "model": "WH-1000",
    "color": "Black",
    "weight": "250g"
  },
  "createdAt": "2025-01-21T10:30:00.000Z",
  "updatedAt": "2025-01-21T10:30:00.000Z"
}
```

**Error Response (404)**:
```json
{
  "success": false,
  "message": "Product not found",
  "error": "PRODUCT_NOT_FOUND"
}
```

### POST /products
**Purpose**: Create a new product (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/products`  

**Request Body**:
```json
{
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "price": 1999.99,
  "category": "Electronics",
  "stock": 50,
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "specifications": {
    "brand": "TechBrand",
    "model": "WH-1000",
    "color": "Black"
  }
}
```

**Success Response (201)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "name": "Wireless Headphones",
  "price": 1999.99,
  "stock": 50,
  "isActive": true,
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

### PUT /products/:id
**Purpose**: Update an existing product (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/products/65f1a2b3c4d5e6f7g8h9i0j1`  

**Request Body**:
```json
{
  "price": 1799.99,
  "stock": 75,
  "isActive": true
}
```

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "name": "Wireless Headphones",
  "price": 1799.99,
  "stock": 75,
  "updatedAt": "2025-01-21T11:30:00.000Z"
}
```

### DELETE /products/:id
**Purpose**: Delete a product (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/products/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "message": "Product deleted successfully"
}
```

---

# Shopping Cart Endpoints

### GET /cart
**Purpose**: Get current user's shopping cart contents  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart`  

**Success Response (200)**:
```json
{
  "items": [
    {
      "_id": "cart_item_001",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Wireless Headphones",
      "quantity": 2,
      "price": 1999.99,
      "size": "M",
      "color": "Black",
      "subtotal": 3999.98
    }
  ],
  "total": 3999.98,
  "totalItems": 2,
  "discounts": [
    {
      "type": "percentage",
      "amount": 799.99,
      "description": "20% OFF Electronics"
    }
  ],
  "finalTotal": 3199.99
}
```

### POST /cart/add
**Purpose**: Add a product to the shopping cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/add`  

**Request Body**:
```json
{
  "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "quantity": 2,
  "size": "M",
  "color": "Black"
}
```

**Success Response (201)**:
```json
{
  "message": "Product added to cart successfully",
  "cartItem": {
    "_id": "cart_item_001",
    "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "quantity": 2,
    "price": 1999.99,
    "subtotal": 3999.98
  },
  "cartTotal": 3999.98
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "Insufficient stock",
  "error": "INSUFFICIENT_STOCK"
}
```

### PUT /cart/:itemId
**Purpose**: Update quantity of a cart item  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/cart_item_001`  

**Request Body**:
```json
{
  "quantity": 3
}
```

**Success Response (200)**:
```json
{
  "message": "Cart item updated successfully",
  "cartItem": {
    "_id": "cart_item_001",
    "quantity": 3,
    "subtotal": 5999.97
  },
  "cartTotal": 5999.97
}
```

### DELETE /cart/:itemId
**Purpose**: Remove an item from the shopping cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/cart_item_001`  

**Success Response (200)**:
```json
{
  "message": "Item removed from cart successfully",
  "cartTotal": 0
}
```

### GET /cart/summary-with-discounts
**Purpose**: Get cart summary with all applicable discounts and promotions  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/summary-with-discounts`  

**Query Parameters**:
- `couponCode` (string): Optional coupon code to apply

**Success Response (200)**:
```json
{
  "items": [
    {
      "_id": "cart_item_001",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Wireless Headphones",
      "quantity": 2,
      "originalPrice": 1999.99,
      "discountedPrice": 1599.99,
      "subtotal": 3199.98
    }
  ],
  "subtotal": 3999.98,
  "discounts": [
    {
      "type": "percentage",
      "amount": 799.99,
      "description": "20% OFF Electronics",
      "promotionId": "promo_001"
    }
  ],
  "totalDiscount": 799.99,
  "shipping": 500.00,
  "finalTotal": 3700.00
}
```

---

# Order Management Endpoints

### GET /orders
**Purpose**: Get list of user's orders with pagination  
**Authentication**: Required  
**URL**: `http://localhost:3001/orders`  

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by order status

**Success Response (200)**:
```json
{
  "orders": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "orderNumber": "ORD-2025-001",
      "status": "completed",
      "total": 3700.00,
      "items": [
        {
          "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
          "productName": "Wireless Headphones",
          "quantity": 2,
          "price": 1599.99
        }
      ],
      "shippingAddress": {
        "street": "Av. Corrientes 1234",
        "city": "Buenos Aires",
        "zipCode": "1043"
      },
      "paymentStatus": "completed",
      "trackingNumber": "TRK123456789",
      "createdAt": "2025-01-21T10:30:00.000Z",
      "deliveredAt": "2025-01-23T15:45:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "totalPages": 2
}
```

### GET /orders/:id
**Purpose**: Get detailed information about a specific order  
**Authentication**: Required  
**URL**: `http://localhost:3001/orders/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "orderNumber": "ORD-2025-001",
  "status": "shipped",
  "paymentStatus": "completed",
  "total": 3700.00,
  "subtotal": 3199.98,
  "shippingCost": 500.00,
  "discountAmount": 799.99,
  "items": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Wireless Headphones",
      "quantity": 2,
      "price": 1599.99,
      "subtotal": 3199.98
    }
  ],
  "shippingAddress": {
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "state": "CABA",
    "zipCode": "1043",
    "country": "Argentina"
  },
  "trackingNumber": "TRK123456789",
  "estimatedDelivery": "2025-01-25T18:00:00.000Z",
  "createdAt": "2025-01-21T10:30:00.000Z",
  "shippedAt": "2025-01-22T09:15:00.000Z"
}
```

### POST /orders
**Purpose**: Create a new order from current cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/orders`  

**Request Body**:
```json
{
  "shippingAddressId": "addr_001",
  "paymentMethod": "paypal",
  "couponCode": "SAVE20",
  "shippingMethod": "standard"
}
```

**Success Response (201)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "orderNumber": "ORD-2025-001",
  "status": "pending",
  "total": 3700.00,
  "paymentUrl": "https://www.sandbox.paypal.com/checkoutnow?token=...",
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

### PUT /orders/:id/cancel
**Purpose**: Cancel an order (only if status allows)  
**Authentication**: Required  
**URL**: `http://localhost:3001/orders/65f1a2b3c4d5e6f7g8h9i0j1/cancel`  

**Success Response (200)**:
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "status": "cancelled",
    "cancelledAt": "2025-01-21T11:30:00.000Z"
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "Cannot cancel order that has already been shipped",
  "error": "INVALID_ORDER_STATUS"
}
```

---

# Payment Endpoints

### POST /payments/create-order
**Purpose**: Create a PayPal payment order for checkout  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/create-order`  

**Request Body**:
```json
{
  "cartItems": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "quantity": 2,
      "price": 1599.99
    }
  ],
  "shippingCost": 500.00,
  "couponCode": "SAVE20"
}
```

**Success Response (201)**:
```json
{
  "orderId": "8XY45678ZA123456B",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=8XY45678ZA123456B",
  "amount": {
    "total": 3700.00,
    "currency": "USD",
    "breakdown": {
      "subtotal": 3199.98,
      "shipping": 500.00,
      "discount": 799.99
    }
  }
}
```

### POST /payments/capture-order
**Purpose**: Capture a PayPal payment after user approval  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/capture-order`  

**Request Body**:
```json
{
  "orderId": "8XY45678ZA123456B",
  "paymentId": "PAYID-123456789",
  "payerId": "PAYER123456"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "paymentId": "PAYID-123456789",
  "status": "COMPLETED",
  "amount": 3700.00,
  "currency": "USD",
  "orderId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "capturedAt": "2025-01-21T10:30:00.000Z"
}
```

### POST /payments/cancel-order
**Purpose**: Cancel a PayPal payment order  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/cancel-order`  

**Request Body**:
```json
{
  "orderId": "8XY45678ZA123456B"
}
```

**Success Response (200)**:
```json
{
  "message": "Payment cancelled successfully",
  "orderId": "8XY45678ZA123456B",
  "status": "CANCELLED"
}
```

### GET /payments/order/:orderId
**Purpose**: Get payment order details  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/order/8XY45678ZA123456B`  

**Success Response (200)**:
```json
{
  "orderId": "8XY45678ZA123456B",
  "status": "APPROVED",
  "amount": {
    "total": 3700.00,
    "currency": "USD"
  },
  "payer": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

---

# Promotion & Discount Endpoints

### GET /promotions/active
**Purpose**: Get list of currently active promotions  
**Authentication**: None required  
**URL**: `http://localhost:3001/promotions/active`  

**Query Parameters**:
- `type` (string): Filter by promotion type
- `category` (string): Filter by product category

**Success Response (200)**:
```json
{
  "promotions": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Electronics 20% OFF",
      "type": "percentage",
      "description": "Get 20% discount on all electronics",
      "discountPercentage": 20,
      "startDate": "2025-01-21T00:00:00.000Z",
      "endDate": "2025-01-31T23:59:59.000Z",
      "conditions": {
        "categories": ["Electronics"],
        "minimumPurchaseAmount": 1000
      },
      "isActive": true
    }
  ]
}
```

### GET /promotions/types
**Purpose**: Get all available promotion types and their descriptions  
**Authentication**: None required  
**URL**: `http://localhost:3001/promotions/types`  

**Success Response (200)**:
```json
{
  "types": [
    {
      "id": "percentage",
      "name": "Percentage Discount",
      "description": "Discount by percentage of product price"
    },
    {
      "id": "fixed_amount",
      "name": "Fixed Amount Discount",
      "description": "Fixed amount discount from product price"
    },
    {
      "id": "buy_x_get_y",
      "name": "Buy X Get Y",
      "description": "Buy X items and get Y items free"
    },
    {
      "id": "free_shipping",
      "name": "Free Shipping",
      "description": "Free shipping on qualifying orders"
    }
  ]
}
```

### POST /promotions/apply-discounts
**Purpose**: Calculate applicable discounts for cart items  
**Authentication**: Required  
**URL**: `http://localhost:3001/promotions/apply-discounts`  

**Request Body**:
```json
{
  "couponCode": "SAVE20",
  "cartItems": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "cartItemId": "cart_item_001",
      "productName": "Wireless Headphones",
      "category": "Electronics",
      "quantity": 2,
      "price": 1999.99,
      "size": "M"
    }
  ],
  "totalAmount": 3999.98
}
```

**Success Response (200)**:
```json
{
  "discounts": [
    {
      "promotionId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "promotionName": "Electronics 20% OFF",
      "type": "percentage",
      "discountAmount": 799.99,
      "appliedToItems": ["65f1a2b3c4d5e6f7g8h9i0j1"],
      "description": "20% OFF Electronics"
    }
  ],
  "totalDiscount": 799.99,
  "originalAmount": 3999.98,
  "finalAmount": 3199.99
}
```

### POST /promotions/validate-coupon
**Purpose**: Validate a coupon code without applying it  
**Authentication**: None required  
**URL**: `http://localhost:3001/promotions/validate-coupon`  

**Request Body**:
```json
{
  "couponCode": "SAVE20",
  "userId": "65f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Success Response (200)**:
```json
{
  "valid": true,
  "coupon": {
    "code": "SAVE20",
    "discountPercentage": 20,
    "validUntil": "2025-12-31T23:59:59.000Z",
    "usageLimit": 100,
    "usedCount": 45
  },
  "message": "Coupon is valid and can be applied"
}
```

**Error Response (400)**:
```json
{
  "valid": false,
  "message": "Coupon has expired",
  "error": "COUPON_EXPIRED"
}
```

---

# Shipping Endpoints

### POST /shipping/calculate
**Purpose**: Calculate shipping costs for cart items to specific address  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/calculate`  

**Request Body**:
```json
{
  "addressId": "addr_001",
  "cartItems": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "quantity": 2,
      "weight": 0.5,
      "dimensions": {
        "length": 20,
        "width": 15,
        "height": 10
      }
    }
  ]
}
```

**Success Response (200)**:
```json
{
  "options": [
    {
      "service": "standard",
      "name": "Standard Shipping",
      "cost": 500.00,
      "estimatedDays": 3,
      "description": "Delivery in 3-5 business days",
      "carrier": "DrEnvío"
    },
    {
      "service": "express",
      "name": "Express Shipping",
      "cost": 800.00,
      "estimatedDays": 1,
      "description": "Delivery in 24-48 hours",
      "carrier": "DrEnvío"
    }
  ],
  "freeShippingThreshold": 15000,
  "qualifiesForFreeShipping": false
}
```

### GET /shipping/services
**Purpose**: Get available shipping services and their details  
**Authentication**: None required  
**URL**: `http://localhost:3001/shipping/services`  

**Query Parameters**:
- `zone` (string): Delivery zone (CABA, GBA, INTERIOR)

**Success Response (200)**:
```json
{
  "services": [
    {
      "id": "standard",
      "name": "Standard Shipping",
      "description": "Delivery in 3-5 business days",
      "features": ["Tracking included", "Home delivery"],
      "maxWeight": 30,
      "maxDimensions": {
        "length": 100,
        "width": 100,
        "height": 100
      },
      "availableIn": ["CABA", "GBA", "INTERIOR"],
      "baseRate": 500.00
    }
  ]
}
```

### GET /shipping/tracking/:trackingNumber
**Purpose**: Get tracking information for a shipment  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/tracking/TRK123456789`  

**Success Response (200)**:
```json
{
  "trackingNumber": "TRK123456789",
  "status": "in_transit",
  "estimatedDelivery": "2025-01-25T18:00:00.000Z",
  "currentLocation": "Distribution Center - Buenos Aires",
  "history": [
    {
      "timestamp": "2025-01-21T10:30:00.000Z",
      "status": "created",
      "description": "Shipment created",
      "location": "Origin facility"
    },
    {
      "timestamp": "2025-01-22T08:15:00.000Z",
      "status": "picked_up",
      "description": "Package picked up",
      "location": "Origin facility"
    },
    {
      "timestamp": "2025-01-22T14:30:00.000Z",
      "status": "in_transit",
      "description": "In transit to destination",
      "location": "Distribution Center - Buenos Aires"
    }
  ]
}
```

---

# Review Endpoints

### GET /reviews/product/:productId
**Purpose**: Get reviews for a specific product with pagination  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/product/65f1a2b3c4d5e6f7g8h9i0j1`  

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `rating` (number): Filter by rating (1-5)
- `sortBy` (string): Sort by (date, rating, helpfulness)

**Success Response (200)**:
```json
{
  "reviews": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "userId": "user_001",
      "userName": "John Doe",
      "rating": 5,
      "comment": "Excellent product, highly recommended!",
      "isVerified": true,
      "photos": [
        "https://example.com/review1.jpg"
      ],
      "helpfulVotes": 12,
      "totalVotes": 15,
      "createdAt": "2025-01-21T10:30:00.000Z"
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
  },
  "page": 1,
  "totalPages": 3
}
```

### POST /reviews
**Purpose**: Create a new product review  
**Authentication**: Required  
**URL**: `http://localhost:3001/reviews`  

**Request Body**:
```json
{
  "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "orderId": "order_001",
  "rating": 5,
  "comment": "Excellent product, highly recommended!",
  "photos": [
    "https://example.com/review1.jpg",
    "https://example.com/review2.jpg"
  ]
}
```

**Success Response (201)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "userId": "user_001",
  "rating": 5,
  "comment": "Excellent product, highly recommended!",
  "isVerified": true,
  "photos": [
    "https://example.com/review1.jpg",
    "https://example.com/review2.jpg"
  ],
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "You have already reviewed this product",
  "error": "DUPLICATE_REVIEW"
}
```

### PUT /reviews/:id
**Purpose**: Update an existing review  
**Authentication**: Required (Review author only)  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1`  

**Request Body**:
```json
{
  "rating": 4,
  "comment": "Good product, updated my review after extended use"
}
```

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "rating": 4,
  "comment": "Good product, updated my review after extended use",
  "updatedAt": "2025-01-21T11:30:00.000Z"
}
```

### DELETE /reviews/:id
**Purpose**: Delete a review  
**Authentication**: Required (Review author or Admin)  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "message": "Review deleted successfully"
}
```

### POST /reviews/:id/like
**Purpose**: Mark a review as helpful  
**Authentication**: Required  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1/like`  

**Request Body**:
```json
{
  "helpful": true
}
```

**Success Response (200)**:
```json
{
  "message": "Review marked as helpful",
  "helpfulVotes": 13,
  "totalVotes": 16
}
```

---

# Admin Endpoints

### GET /admin/dashboard
**Purpose**: Get admin dashboard statistics and overview  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/dashboard`  

**Success Response (200)**:
```json
{
  "stats": {
    "totalOrders": 1250,
    "totalRevenue": 125000.00,
    "totalUsers": 850,
    "totalProducts": 150,
    "pendingOrders": 25,
    "lowStockProducts": 8,
    "activePromotions": 5
  },
  "recentOrders": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "orderNumber": "ORD-2025-001",
      "customerName": "John Doe",
      "total": 3700.00,
      "status": "pending",
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "topProducts": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Wireless Headphones",
      "totalSold": 150,
      "revenue": 299998.50
    }
  ],
  "salesChart": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
    "data": [10000, 15000, 20000, 18000, 25000]
  }
}
```

### GET /admin/users
**Purpose**: Get list of all users with admin management options  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/users`  

**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by name or email
- `role` (string): Filter by user role

**Success Response (200)**:
```json
{
  "users": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "isActive": true,
      "totalOrders": 5,
      "totalSpent": 12500.00,
      "lastLoginAt": "2025-01-21T10:30:00.000Z",
      "createdAt": "2025-01-15T08:00:00.000Z"
    }
  ],
  "total": 850,
  "page": 1,
  "totalPages": 85
}
```

### PUT /admin/orders/:id/status
**Purpose**: Update order status (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/orders/65f1a2b3c4d5e6f7g8h9i0j1/status`  

**Request Body**:
```json
{
  "status": "shipped",
  "trackingNumber": "TRK123456789",
  "notes": "Package shipped via DrEnvío"
}
```

**Success Response (200)**:
```json
{
  "message": "Order status updated successfully",
  "order": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "status": "shipped",
    "trackingNumber": "TRK123456789",
    "shippedAt": "2025-01-21T11:30:00.000Z"
  }
}
```

---

# Error Codes

## HTTP Status Codes
- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate data)
- **422**: Unprocessable Entity (validation failed)
- **500**: Internal Server Error

## Custom Error Codes
- **INVALID_CREDENTIALS**: Login credentials are incorrect
- **DUPLICATE_EMAIL**: Email address already registered
- **PRODUCT_NOT_FOUND**: Requested product does not exist
- **INSUFFICIENT_STOCK**: Not enough product inventory
- **INVALID_ORDER_STATUS**: Operation not allowed for current order status
- **COUPON_EXPIRED**: Coupon code has expired
- **COUPON_INVALID**: Coupon code is not valid
- **DUPLICATE_REVIEW**: User has already reviewed this product
- **UNAUTHORIZED_ACCESS**: User lacks required permissions
- **PAYMENT_FAILED**: Payment processing failed
- **SHIPPING_UNAVAILABLE**: Shipping not available to specified address

## Rate Limiting
- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour
- **Admin users**: 5000 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp
