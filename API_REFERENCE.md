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

# Location Services Endpoints

## OpenStreetMap Nominatim API Integration

### GET /location/search
**Purpose**: Search for places in Mexico using OpenStreetMap Nominatim API (completely free)  
**Authentication**: None required  
**URL**: `http://localhost:3001/location/search?q=Guadalajara`  

**Query Parameters**:
- `q` (string, required): Search query (minimum 2 characters)

**Success Response (200)**:
```json
{
  "success": true,
  "results": [
    {
      "place_id": "288739709",
      "formatted_address": "Guadalajara, Región Centro, Jalisco, 44450, México",
      "name": "Guadalajara",
      "geometry": {
        "location": {
          "lat": 20.6720375,
          "lng": -103.3383960
        }
      }
    },
    {
      "place_id": "287610252",
      "formatted_address": "Guadalajara, Región Centro, Jalisco, México",
      "name": "Guadalajara",
      "geometry": {
        "location": {
          "lat": 20.6782613,
          "lng": -103.3357646
        }
      }
    }
  ],
  "count": 2
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "Query must be at least 2 characters long",
  "results": []
}
```

### GET /location/details
**Purpose**: Get detailed information about a specific place  
**Authentication**: None required  
**URL**: `http://localhost:3001/location/details?placeId=288739709`  

**Query Parameters**:
- `placeId` (string, required): OpenStreetMap Nominatim place ID

**Success Response (200)**:
```json
{
  "success": true,
  "placeDetails": {
    "result": {
      "place_id": "288739709",
      "formatted_address": "Guadalajara, Región Centro, Jalisco, 44450, México",
      "address_components": [
        {
          "long_name": "México",
          "short_name": "MX",
          "types": ["country", "political"]
        },
        {
          "long_name": "Jalisco",
          "short_name": "Jalisco",
          "types": ["administrative_area_level_1", "political"]
        },
        {
          "long_name": "Guadalajara",
          "short_name": "Guadalajara",
          "types": ["locality", "political"]
        },
        {
          "long_name": "44450",
          "short_name": "44450",
          "types": ["postal_code"]
        }
      ],
      "geometry": {
        "location": {
          "lat": 20.6720375,
          "lng": -103.3383960
        }
      }
    }
  },
  "drenvioAddress": {
    "country": "MX",
    "postal_code": "44450",
    "state": "Jalisco",
    "city": "Guadalajara",
    "address": "Guadalajara, Región Centro, Jalisco, 44450, México"
  }
}
```

### POST /location/format-address
**Purpose**: Format OpenStreetMap Nominatim data for Drenvio shipping  
**Authentication**: None required  
**URL**: `http://localhost:3001/location/format-address`  

**Request Body**:
```json
{
  "placeDetails": {
    "result": {
      "place_id": "288739709",
      "formatted_address": "Guadalajara, Región Centro, Jalisco, 44450, México",
      "address_components": [
        {
          "long_name": "México",
          "short_name": "MX",
          "types": ["country", "political"]
        },
        {
          "long_name": "Jalisco",
          "short_name": "Jalisco",
          "types": ["administrative_area_level_1", "political"]
        },
        {
          "long_name": "Guadalajara",
          "short_name": "Guadalajara",
          "types": ["locality", "political"]
        },
        {
          "long_name": "44450",
          "short_name": "44450",
          "types": ["postal_code"]
        }
      ]
    }
  },
  "contact": {
    "name": "María López",
    "phone": "3339876543",
    "email": "maria.lopez@example.com"
  }
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "drenvioAddress": {
    "country": "MX",
    "postal_code": "44450",
    "state": "Jalisco",
    "city": "Guadalajara",
    "address": "Guadalajara, Región Centro, Jalisco, 44450, México",
    "contact": {
      "name": "María López",
      "phone": "3339876543",
      "email": "maria.lopez@example.com"
    }
  },
  "validation": {
    "isValid": true,
    "errors": []
  }
}
```

### POST /location/validate-address
**Purpose**: Validate address data for shipping  
**Authentication**: None required  
**URL**: `http://localhost:3001/location/validate-address`  

**Request Body**:
```json
{
  "country": "MX",
  "postal_code": "44100",
  "state": "Jalisco",
  "city": "Guadalajara",
  "address": "Calle Independencia 456, Centro, Guadalajara, JAL",
  "contact": {
    "name": "María López",
    "phone": "3339876543",
    "email": "maria.lopez@example.com"
  }
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "errors": []
  },
  "address": {
    "country": "MX",
    "postal_code": "44100",
    "state": "Jalisco",
    "city": "Guadalajara",
    "address": "Calle Independencia 456, Centro, Guadalajara, JAL",
    "contact": {
      "name": "María López",
      "phone": "3339876543",
      "email": "maria.lopez@example.com"
    }
  }
}
```

**Error Response (400)**:
```json
{
  "success": true,
  "validation": {
    "isValid": false,
    "errors": [
      "Código postal es requerido y debe tener al menos 5 dígitos",
      "Ciudad es requerida"
    ]
  },
  "address": {
    "country": "MX",
    "postal_code": "",
    "state": "Jalisco",
    "city": "",
    "address": "Calle Independencia 456"
  }
}
```

## Frontend-Specific Endpoints

### GET /location/countries
**Purpose**: Get list of supported countries for location search  
**Authentication**: None required  
**URL**: `http://localhost:3001/location/countries`  

**Success Response (200)**:
```json
{
  "success": true,
  "countries": [
    {
      "code": "mx",
      "name": "México",
      "flag": "🇲🇽"
    },
    {
      "code": "ar",
      "name": "Argentina",
      "flag": "🇦🇷"
    },
    {
      "code": "co",
      "name": "Colombia",
      "flag": "🇨🇴"
    },
    {
      "code": "pe",
      "name": "Perú",
      "flag": "🇵🇪"
    },
    {
      "code": "cl",
      "name": "Chile",
      "flag": "🇨🇱"
    },
    {
      "code": "br",
      "name": "Brasil",
      "flag": "🇧🇷"
    }
  ]
}
```

### GET /location/search/options
**Purpose**: Search locations with simplified response for frontend selects  
**Authentication**: None required  
**URL**: `http://localhost:3001/location/search/options?q=Guadalajara&country=mx`  

**Query Parameters**:
- `q` (string, required): Search query (minimum 2 characters)
- `country` (string, optional): Country code (default: 'mx')

**Success Response (200)**:
```json
{
  "success": true,
  "options": [
    {
      "value": "288739709",
      "label": "Guadalajara",
      "placeId": "288739709",
      "address": "Guadalajara, Región Centro, Jalisco, 44450, México",
      "coordinates": {
        "lat": 20.6720375,
        "lng": -103.3383960
      }
    },
    {
      "value": "287610252",
      "label": "Guadalajara",
      "placeId": "287610252",
      "address": "Guadalajara, Región Centro, Jalisco, México",
      "coordinates": {
        "lat": 20.6782613,
        "lng": -103.3357646
      }
    }
  ],
  "message": "Se encontraron 2 ubicaciones"
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "options": [],
  "message": "La búsqueda debe tener al menos 2 caracteres"
}
```

### GET /location/cities/popular
**Purpose**: Get popular cities for a specific country  
**Authentication**: None required  
**URL**: `http://localhost:3001/location/cities/popular?country=mx`  

**Query Parameters**:
- `country` (string, optional): Country code (default: 'mx')

**Success Response (200)**:
```json
{
  "success": true,
  "cities": [
    {
      "name": "Ciudad de México",
      "state": "CDMX",
      "postalCode": "06000"
    },
    {
      "name": "Guadalajara",
      "state": "Jalisco",
      "postalCode": "44100"
    },
    {
      "name": "Monterrey",
      "state": "Nuevo León",
      "postalCode": "64000"
    },
    {
      "name": "Puebla",
      "state": "Puebla",
      "postalCode": "72000"
    },
    {
      "name": "Tijuana",
      "state": "Baja California",
      "postalCode": "22000"
    }
  ],
  "country": "MX"
}
```

**Argentina Example**:
```json
{
  "success": true,
  "cities": [
    {
      "name": "Buenos Aires",
      "state": "CABA",
      "postalCode": "1000"
    },
    {
      "name": "Córdoba",
      "state": "Córdoba",
      "postalCode": "5000"
    },
    {
      "name": "Rosario",
      "state": "Santa Fe",
      "postalCode": "2000"
    },
    {
      "name": "Mendoza",
      "state": "Mendoza",
      "postalCode": "5500"
    }
  ],
  "country": "AR"
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
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/auth/google`  

**Response**: Redirects to Google OAuth consent screen (HTTP 302)

**cURL Example**:
```bash
curl -v http://localhost:3001/auth/google
```

### GET /auth/google/callback
**Purpose**: Handle Google OAuth callback (used internally by Google)  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/auth/google/callback`  

**Query Parameters**:
- `code` (string): Authorization code from Google
- `state` (string): State parameter for CSRF protection

**Response**: Redirects to frontend with JWT token and user data:
```
http://localhost:3000/?token=JWT_TOKEN&user=USER_DATA&login=success
```

### GET /auth/google/auth-url
**Purpose**: Get Google OAuth authorization URL for frontend integration  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/auth/google/auth-url`  

**Query Parameters**:
- `state` (optional): CSRF protection state parameter

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=55103940796-j4ba6381l5brnd5aapb511vonbr62kq4.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fauth%2Fgoogle%2Fcallback&scope=profile%20email&response_type=code&state=default",
    "state": "default"
  },
  "message": "Request successful"
}
```

**cURL Example**:
```bash
curl http://localhost:3001/auth/google/auth-url
```

### GET /auth/google/profile
**Purpose**: Get Google user's basic profile information  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/profile`  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

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

**cURL Example**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/auth/google/profile
```

### GET /auth/google/profile/complete
**Purpose**: Get complete Google user profile with all configurable data  
**Authentication**: Required (JWT Token from Google OAuth)  
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
    "displayName": "John Doe",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
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
    "locale": "es-AR",
    "timezone": "America/Argentina/Buenos_Aires",
    "isGoogleUser": true,
    "linkedUserId": null,
    "createdAt": "2025-01-21T10:30:00.000Z",
    "lastLoginAt": "2025-01-21T10:30:00.000Z"
  }
}
```

### PUT /auth/google/profile
**Purpose**: Update Google user's profile information  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/profile`  

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
    "preferredLanguage": "es",
    "timezone": "America/Argentina/Buenos_Aires"
  }
}
```

### POST /auth/google/addresses
**Purpose**: Add a new shipping address for Google user  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/addresses`  

**Request Body**:
```json
{
  "type": "home",
  "street": "Av. Corrientes 1234",
  "apartment": "Apto 5B",
  "neighborhood": "Centro",
  "city": "Buenos Aires",
  "state": "CABA",
  "postalCode": "1043",
  "country": "Argentina",
  "references": "Entre Callao y Corrientes",
  "receiverName": "John Doe",
  "receiverPhone": "+54 11 1234-5678",
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
    "apartment": "Apto 5B",
    "neighborhood": "Centro",
    "city": "Buenos Aires",
    "state": "CABA",
    "postalCode": "1043",
    "country": "Argentina",
    "references": "Entre Callao y Corrientes",
    "receiverName": "John Doe",
    "receiverPhone": "+54 11 1234-5678",
    "isDefault": true,
    "isActive": true,
    "createdAt": "2025-01-21T10:30:00.000Z"
  }
}
```

### PUT /auth/google/addresses/:addressId
**Purpose**: Update an existing shipping address  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/addresses/addr_002`  

**Request Body**:
```json
{
  "street": "Av. Santa Fe 5678",
  "apartment": "Piso 10",
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
    "apartment": "Piso 10",
    "isDefault": false,
    "updatedAt": "2025-01-21T11:30:00.000Z"
  }
}
```

### DELETE /auth/google/addresses/:addressId
**Purpose**: Delete a shipping address  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/addresses/addr_002`  

**Success Response (200)**:
```json
{
  "message": "Address deleted successfully"
}
```

### POST /auth/google/preferences
**Purpose**: Update Google user's preferences and settings  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/preferences`  

**Request Body**:
```json
{
  "emailNotifications": true,
  "orderNotifications": true,
  "shippingNotifications": true,
  "promotionNotifications": false,
  "smsNotifications": false,
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
  "message": "Preferences updated successfully"
}
```

### POST /auth/google/link
**Purpose**: Link Google account to an existing traditional user account  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/link`  

**Request Body**:
```json
{
  "traditionalUserId": "65f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Success Response (200)**:
```json
{
  "message": "Successfully linked Google account to traditional user",
  "linked": true,
  "user": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "googleId": "1234567890",
    "email": "user@gmail.com",
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "displayName": "John Doe",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "isGoogleUser": true,
    "linkedUserId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 604800
  }
}
```

### POST /auth/google/unlink
**Purpose**: Unlink Google account from traditional user account  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/unlink`  

**Success Response (200)**:
```json
{
  "message": "Successfully unlinked Google account from traditional user",
  "linked": false,
  "user": {
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
}
```

### POST /auth/google/logout
**Purpose**: Logout Google user (invalidate session)  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/logout`  

**Success Response (200)**:
```json
{
  "message": "Logged out successfully"
}
```

### GET /auth/google/stats
**Purpose**: Get Google user statistics (Development/Admin only)  
**Authentication**: Required (JWT Token from Google OAuth)  
**URL**: `http://localhost:3001/auth/google/stats`  

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "totalGoogleUsers": 1250,
    "activeUsers": 850,
    "newUsersToday": 25,
    "linkedAccounts": 150,
    "loginStats": {
      "today": 45,
      "thisWeek": 320,
      "thisMonth": 1250
    },
    "userDistribution": {
      "gmail": 850,
      "outlook": 200,
      "yahoo": 100,
      "other": 100
    }
  }
}
```

## Google OAuth Configuration

### Environment Variables
```env
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google OAuth2 URLs
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=http://localhost:3000/
GOOGLE_FAILURE_REDIRECT=http://localhost:3000/login?error=auth_failed

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d

# Email Domain Restrictions (Optional)
ALLOWED_EMAIL_DOMAINS=gmail.com,outlook.com,yahoo.com,hotmail.com

# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox
PAYPAL_BASE_URL=http://localhost:3001

# Mercado Pago Configuration
MERCADOPAGO_ACCESS_TOKEN=APP_USR-your-mercadopago-access-token
MERCADOPAGO_INTEGRATOR_ID=your-integrator-id
MERCADOPAGO_CURRENCY=ARS
MP_BINARY_MODE=true

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/nabra_xr1

# Public Base URL
PUBLIC_BASE_URL=http://localhost:3001

# Application Configuration
NODE_ENV=development
PORT=3001
```

### Google Cloud Console Setup
1. **Project**: Create a new project in Google Cloud Console
2. **Enable APIs**: Enable Google+ API and Google OAuth2 API
3. **Create Credentials**: 
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs: 
     - `http://localhost:3001/auth/google/callback` (Development)
     - `https://yourdomain.com/auth/google/callback` (Production)
4. **Scopes**: `profile`, `email`
5. **Configure Consent Screen**: Set up OAuth consent screen with your application information

### Authentication Flow
1. **Frontend**: Call `/auth/google/auth-url` to get authorization URL
2. **User**: Redirected to Google OAuth consent screen
3. **Google**: Redirects to `/auth/google/callback` with authorization code
4. **Backend**: Exchanges code for user info and creates/updates user
5. **Backend**: Generates JWT token and redirects to frontend
6. **Frontend**: Receives JWT token and user data via URL parameters

### cURL Testing Commands
```bash
# 1. Get authorization URL
curl http://localhost:3001/auth/google/auth-url

# 2. Start OAuth flow (redirects to Google)
curl -I http://localhost:3001/auth/google

# 3. Get user profile (after login)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/auth/google/profile

# 4. Get complete profile
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/auth/google/profile/complete

# 5. Update profile
curl -X PUT \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "preferredLanguage": "es"}' \
  http://localhost:3001/auth/google/profile

# 6. Add address
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"street": "Calle Principal 123", "city": "Buenos Aires", "state": "CABA", "postalCode": "1043", "country": "Argentina", "isDefault": true}' \
  http://localhost:3001/auth/google/addresses

# 7. Update preferences
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailNotifications": true, "preferredLanguage": "es"}' \
  http://localhost:3001/auth/google/preferences

# 8. Logout
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/auth/google/logout
```

## Payment Testing Commands

### PayPal Testing
```bash
# 1. Create payment from cart
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/payments/from-cart

# 2. Create partial payment
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"selectedItems":[{"cartItemId":"cart_item_001","requestedQuantity":2}],"returnUrl":"https://example.com/success","cancelUrl":"https://example.com/cancel"}' \
  http://localhost:3001/payments/partial-checkout

# 3. Capture payment
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payerId":"PAYER123456"}' \
  http://localhost:3001/payments/PAYMENT_ID/capture

# 4. Get payment details
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/payments/PAYMENT_ID

# 5. Cancel payment
curl -X DELETE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/payments/PAYMENT_ID
```

### Mercado Pago Testing
```bash
# 1. Create Mercado Pago checkout
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/payments/mercadopago/checkout

# 2. Create partial Mercado Pago checkout
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"selectedItems":[{"cartItemId":"cart_item_001","requestedQuantity":2}],"returnUrl":"https://example.com/success","cancelUrl":"https://example.com/cancel"}' \
  http://localhost:3001/payments/mercadopago/partial-checkout

# 3. Handle Mercado Pago return (simulate)
curl "http://localhost:3001/payments/mercadopago/return?payment_id=123456789&status=approved&external_reference=cart_id"

# 4. Get user payments
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3001/payments?limit=10&offset=0"
```

## Product Categories Testing Commands
```bash
# 1. Get all categories
curl http://localhost:3001/products/categories

# 2. Get all sandals (simple category filter)
curl "http://localhost:3001/products?category=sandalias"

# 3. Get sandals with price range
curl "http://localhost:3001/products?category=sandalias&minPrice=5000&maxPrice=15000"

# 4. Search for leather sandals
curl "http://localhost:3001/products?category=sandalias&search=cuero"

# 5. Get featured products in specific size
curl "http://localhost:3001/products?isFeatured=true&size=38"

# 6. Get all sneakers sorted by price
curl "http://localhost:3001/products?category=zapatillas&sortBy=price&sortOrder=asc"

# 7. Get preorder products
curl "http://localhost:3001/products?isPreorder=true"

# 8. Search all products
curl "http://localhost:3001/products/search?q=cuero"

# 9. Get category statistics
curl http://localhost:3001/products/categories/sandalias/stats

# 10. Complex filter: leather sandals size 38, featured, under 12000
curl "http://localhost:3001/products?category=sandalias&search=cuero&size=38&isFeatured=true&maxPrice=12000"

# 11. Get products by specific size across all categories
curl "http://localhost:3001/products?size=38"

# 12. Get preorder products in a specific category
curl "http://localhost:3001/products?category=zapatillas&isPreorder=true"

# 13. Search with relevance sorting (when using search parameter)
curl "http://localhost:3001/products?search=cuero&sortBy=relevance"

# 14. Get products sorted by price ascending
curl "http://localhost:3001/products?sortBy=price&sortOrder=asc"

# 15. Get products sorted by creation date (newest first)
curl "http://localhost:3001/products?sortBy=createdAt&sortOrder=desc"

# 16. Pagination example - get page 2 with 6 items per page
curl "http://localhost:3001/products?page=2&limit=6"

# 17. Get all sneakers with price under 10000
curl "http://localhost:3001/products?category=zapatillas&maxPrice=10000"

# 18. Get boots with heel, size 36, featured
curl "http://localhost:3001/products?category=botas&search=tacón&size=36&isFeatured=true"

# 19. Get platform shoes with specific price range
curl "http://localhost:3001/products?category=plataformas&minPrice=8000&maxPrice=18000"

# 20. Get all products with pagination and sorting
curl "http://localhost:3001/products?page=1&limit=12&sortBy=createdAt&sortOrder=desc"
```

---

# Product Management Endpoints

### GET /products
**Purpose**: Get list of products with advanced filtering and pagination  
**Authentication**: None required  
**URL**: `http://localhost:3001/products`  

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12)
- `category` (string): Filter by category (e.g., "sandalias", "zapatillas", "botas")
- `search` (string): Search in product name/description
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort field (price, name, createdAt, relevance)
- `sortOrder` (string): Sort direction (asc, desc)
- `isFeatured` (boolean): Filter featured products (true/false)
- `isPreorder` (boolean): Filter preorder products (true/false)
- `size` (string): Filter by available size (e.g., "38", "40")

**Success Response (200)**:
```json
{
  "products": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Sandalias de Cuero Premium",
      "description": "Sandalias elegantes de cuero italiano",
      "price": 8999.99,
      "category": "sandalias",
      "sizes": ["35", "36", "37", "38", "39", "40"],
      "images": [
        "https://example.com/sandalias1.jpg"
      ],
      "stock": 25,
      "isPreorder": false,
      "isFeatured": true,
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

**Examples**:
```bash
# Get all products
curl http://localhost:3001/products

# Get all sandals
curl "http://localhost:3001/products?category=sandalias"

# Get sandals with price filter
curl "http://localhost:3001/products?category=sandalias&minPrice=5000&maxPrice=15000"

# Search for leather sandals
curl "http://localhost:3001/products?category=sandalias&search=cuero"

# Get featured products in size 38
curl "http://localhost:3001/products?isFeatured=true&size=38"

# Search with sorting by price
curl "http://localhost:3001/products?search=zapatillas&sortBy=price&sortOrder=asc"

# Get preorder products
curl "http://localhost:3001/products?isPreorder=true"
```

### GET /products/categories
**Purpose**: Get all available product categories with product counts  
**Authentication**: None required  
**URL**: `http://localhost:3001/products/categories`  

**Success Response (200)**:
```json
[
  {
    "category": "sandalias",
    "count": 25
  },
  {
    "category": "zapatillas",
    "count": 40
  },
  {
    "category": "botas",
    "count": 18
  },
  {
    "category": "plataformas",
    "count": 12
  }
]
```

### GET /products/categories/:category/stats
**Purpose**: Get detailed statistics for a specific category  
**Authentication**: None required  
**URL**: `http://localhost:3001/products/categories/sandalias/stats`  

**Success Response (200)**:
```json
{
  "category": "sandalias",
  "totalProducts": 25,
  "priceRange": {
    "min": 4999.99,
    "max": 15999.99
  },
  "averagePrice": 8999.50,
  "availableSizes": ["35", "36", "37", "38", "39", "40", "41", "42"],
  "featuredProducts": 8,
  "preorderProducts": 3
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
  "name": "Sandalias de Cuero Premium",
  "description": "Sandalias elegantes de cuero italiano con detalles artesanales",
  "price": 8999.99,
  "category": "sandalias",
  "sizes": ["35", "36", "37", "38", "39", "40", "41", "42"],
  "images": [
    "https://example.com/sandalias1.jpg",
    "https://example.com/sandalias2.jpg",
    "https://example.com/sandalias3.jpg"
  ],
  "stock": 25,
  "isPreorder": false,
  "isFeatured": true,
  "reviewStats": {
    "totalReviews": 45,
    "averageRating": 4.7,
    "ratingDistribution": {
      "1": 0,
      "2": 1,
      "3": 4,
      "4": 15,
      "5": 25
    }
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

### POST /orders/with-shipping
**Purpose**: Create order with shipping information  
**Authentication**: Required  
**URL**: `http://localhost:3001/orders/with-shipping`  

**Request Body**:
```json
{
  "notes": "Please handle with care"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "order": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "items": [...],
    "subtotal": 5000.00,
    "shippingCost": 290.00,
    "tax": 846.40,
    "total": 6136.40,
    "shippingInfo": {
      "rateId": "f9e9d82d-be82-41ce-bcc1-88a669191ecf",
      "carrier": "fedex",
      "service": "ground",
      "price": 290,
      "currency": "MXN",
      "days": "3 a 5 días",
      "serviceId": "fedex_mx_A-P16_ground",
      "trackingNumber": "FEDEX123456789",
      "shipmentId": "shipment_123456789",
      "status": "created",
      "labelUrl": "https://prod.api-drenvio.com/labels/123456789.pdf"
    },
    "status": "pending",
    "createdAt": "2025-01-21T10:30:00.000Z"
  },
  "message": "Order created successfully with shipping"
}
```

### GET /orders/my-orders/:id/shipping-status
**Purpose**: Get shipping status for a specific order  
**Authentication**: Required  
**URL**: `http://localhost:3001/orders/my-orders/65f1a2b3c4d5e6f7g8h9i0j1/shipping-status`  

**Success Response (200)**:
```json
{
  "orderId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "shipmentId": "shipment_123456789",
  "trackingNumber": "FEDEX123456789",
  "status": "in_transit",
  "carrier": "fedex",
  "service": "ground",
  "lastUpdate": "2025-01-22T08:15:00.000Z",
  "trackingEvents": [
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
    }
  ]
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "No shipment information available for this order",
  "error": "BAD_REQUEST"
}
```

---

# Payment Endpoints

## PayPal Payments

### POST /payments/from-cart
**Purpose**: Create a PayPal payment from user's cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/from-cart`  

**Query Parameters**:
- `returnUrl` (string, optional): URL to redirect after successful payment
- `cancelUrl` (string, optional): URL to redirect if payment is cancelled

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

### POST /payments/partial-checkout
**Purpose**: Create a partial checkout payment for selected cart items  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/partial-checkout`  

**Request Body**:
```json
{
  "selectedItems": [
    {
      "cartItemId": "cart_item_001",
      "requestedQuantity": 2
    }
  ],
  "returnUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Success Response (201)**:
```json
{
  "orderId": "8XY45678ZA123456B",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=8XY45678ZA123456B",
  "amount": {
    "total": 3199.98,
    "currency": "USD"
  }
}
```

### POST /payments/paypal/success
**Purpose**: Handle PayPal payment success callback  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/payments/paypal/success`  

**Query Parameters**:
- `token` (string): PayPal payment token/ID
- `PayerID` (string): PayPal payer ID

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Payment completed successfully",
  "payment": {
    "paymentId": "PAYID-123456789",
    "status": "COMPLETED",
    "amount": 3700.00
  }
}
```

### GET /payments/paypal/cancel
**Purpose**: Handle PayPal payment cancellation  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/payments/paypal/cancel`  

**Success Response (200)**:
```json
{
  "success": false,
  "message": "Payment was cancelled by user"
}
```

### POST /payments/webhook/paypal
**Purpose**: Handle PayPal webhook notifications  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/payments/webhook/paypal`  

**Request Body**: PayPal webhook payload

**Success Response (200)**:
```json
{
  "status": "received"
}
```

### POST /payments/:paymentId/capture
**Purpose**: Capture a PayPal payment after user approval  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/8XY45678ZA123456B/capture`  

**Request Body**:
```json
{
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

### GET /payments/:paymentId
**Purpose**: Get payment details  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/8XY45678ZA123456B`  

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

### DELETE /payments/:paymentId
**Purpose**: Cancel a payment order  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/8XY45678ZA123456B`  

**Success Response (204)**: No content

## Mercado Pago Payments

### POST /payments/mercadopago/checkout
**Purpose**: Create a Mercado Pago checkout from user's cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/mercadopago/checkout`  

**Query Parameters**:
- `successUrl` (string, optional): URL to redirect after successful payment
- `failureUrl` (string, optional): URL to redirect if payment fails
- `pendingUrl` (string, optional): URL to redirect if payment is pending

**Success Response (201)**:
```json
{
  "id": "1234567890-abcdefgh-ijklmnop",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abcdefgh-ijklmnop",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abcdefgh-ijklmnop"
}
```

### POST /payments/mercadopago/partial-checkout
**Purpose**: Create a partial Mercado Pago checkout for selected cart items  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments/mercadopago/partial-checkout`  

**Request Body**:
```json
{
  "selectedItems": [
    {
      "cartItemId": "cart_item_001",
      "requestedQuantity": 2
    }
  ],
  "returnUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Success Response (201)**:
```json
{
  "id": "1234567890-abcdefgh-ijklmnop",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abcdefgh-ijklmnop",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abcdefgh-ijklmnop"
}
```

### GET /payments/mercadopago/return
**Purpose**: Handle Mercado Pago payment return/callback  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/payments/mercadopago/return`  

**Query Parameters**:
- `payment_id` (string, optional): Mercado Pago payment ID
- `status` (string, optional): Payment status (approved, pending, rejected)
- `merchant_order_id` (string, optional): Merchant order ID
- `external_reference` (string, optional): External reference (cart ID)

**Response**: Redirects to frontend with payment result

### POST /payments/webhook/mercadopago
**Purpose**: Handle Mercado Pago webhook notifications  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/payments/webhook/mercadopago`  

**Query Parameters**:
- `topic` (string): Webhook topic (payment, merchant_order, etc.)
- `id` (string): Resource ID

**Request Body**: Mercado Pago webhook payload

**Headers**:
- `x-signature`: Mercado Pago signature
- `x-request-id`: Request ID
- `user-agent`: User agent

**Success Response (200)**:
```json
{
  "status": "received",
  "processed": true
}
```

### GET /payments
**Purpose**: Get user's payment history  
**Authentication**: Required  
**URL**: `http://localhost:3001/payments`  

**Query Parameters**:
- `limit` (number): Number of payments to return (default: 10, max: 100)
- `offset` (number): Number of payments to skip (default: 0)

**Success Response (200)**:
```json
{
  "payments": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "paymentId": "PAYID-123456789",
      "status": "COMPLETED",
      "amount": 3700.00,
      "currency": "USD",
      "provider": "paypal",
      "orderId": "order_001",
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
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

# Notifications Endpoints

## User Notifications

### GET /notifications
**Purpose**: Get user's notifications with filtering and pagination  
**Authentication**: Required  
**URL**: `http://localhost:3001/notifications`  

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `type` (string): Filter by notification type (ORDER, PROMOTION, WELCOME, etc.)
- `channel` (string): Filter by channel (EMAIL, SMS, PUSH, IN_APP)
- `status` (string): Filter by status (SENT, DELIVERED, READ, FAILED)
- `unreadOnly` (boolean): Show only unread notifications

**Success Response (200)**:
```json
{
  "notifications": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "userId": "user_001",
      "type": "ORDER",
      "channel": "EMAIL",
      "title": "Order Confirmation",
      "content": "Your order #ORD-2025-001 has been confirmed",
      "status": "DELIVERED",
      "isRead": false,
      "metadata": {
        "orderId": "65f1a2b3c4d5e6f7g8h9i0j1",
        "orderNumber": "ORD-2025-001"
      },
      "sentAt": "2025-01-21T10:30:00.000Z",
      "readAt": null,
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 2,
  "unreadCount": 8
}
```

### GET /notifications/stats
**Purpose**: Get user's notification statistics  
**Authentication**: Required  
**URL**: `http://localhost:3001/notifications/stats`  

**Success Response (200)**:
```json
{
  "totalNotifications": 45,
  "unreadCount": 8,
  "readCount": 37,
  "byType": {
    "ORDER": 15,
    "PROMOTION": 12,
    "WELCOME": 5,
    "SHIPPING": 8,
    "REVIEW": 5
  },
  "byChannel": {
    "EMAIL": 30,
    "SMS": 8,
    "PUSH": 7
  },
  "byStatus": {
    "SENT": 40,
    "DELIVERED": 35,
    "READ": 37,
    "FAILED": 5
  }
}
```

### PUT /notifications/:id/read
**Purpose**: Mark a notification as read  
**Authentication**: Required  
**URL**: `http://localhost:3001/notifications/65f1a2b3c4d5e6f7g8h9i0j1/read`  

**Success Response (204)**: No content

### PUT /notifications/read-all
**Purpose**: Mark all notifications as read  
**Authentication**: Required  
**URL**: `http://localhost:3001/notifications/read-all`  

**Success Response (200)**:
```json
{
  "success": true,
  "markedCount": 8
}
```

## User Preferences

### GET /notifications/preferences
**Purpose**: Get user's notification preferences  
**Authentication**: Required  
**URL**: `http://localhost:3001/notifications/preferences`  

**Success Response (200)**:
```json
{
  "userId": "user_001",
  "preferences": {
    "ORDER": {
      "EMAIL": true,
      "SMS": true,
      "PUSH": false,
      "IN_APP": true
    },
    "PROMOTION": {
      "EMAIL": true,
      "SMS": false,
      "PUSH": true,
      "IN_APP": true
    },
    "SHIPPING": {
      "EMAIL": true,
      "SMS": true,
      "PUSH": true,
      "IN_APP": true
    },
    "WELCOME": {
      "EMAIL": true,
      "SMS": false,
      "PUSH": false,
      "IN_APP": true
    }
  },
  "globalSettings": {
    "allowMarketing": true,
    "allowPromotional": true,
    "allowOrderUpdates": true,
    "allowShippingUpdates": true
  }
}
```

### PUT /notifications/preferences
**Purpose**: Update user's notification preferences  
**Authentication**: Required  
**URL**: `http://localhost:3001/notifications/preferences`  

**Request Body**:
```json
{
  "preferences": {
    "ORDER": {
      "EMAIL": true,
      "SMS": false,
      "PUSH": true,
      "IN_APP": true
    },
    "PROMOTION": {
      "EMAIL": false,
      "SMS": false,
      "PUSH": false,
      "IN_APP": false
    }
  },
  "globalSettings": {
    "allowMarketing": false,
    "allowPromotional": false,
    "allowOrderUpdates": true,
    "allowShippingUpdates": true
  }
}
```

**Success Response (200)**:
```json
{
  "message": "Preferences updated successfully",
  "preferences": {
    "ORDER": {
      "EMAIL": true,
      "SMS": false,
      "PUSH": true,
      "IN_APP": true
    },
    "PROMOTION": {
      "EMAIL": false,
      "SMS": false,
      "PUSH": false,
      "IN_APP": false
    }
  }
}
```

## Admin Notifications

### POST /notifications
**Purpose**: Create a new notification (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/notifications`  

**Request Body**:
```json
{
  "userId": "user_001",
  "type": "PROMOTION",
  "channel": "EMAIL",
  "title": "Special Offer",
  "content": "Get 20% off on all sandals this weekend!",
  "templateId": "promotion_template",
  "templateData": {
    "discount": "20%",
    "category": "sandalias",
    "validUntil": "2025-01-25"
  },
  "scheduledFor": "2025-01-21T18:00:00.000Z"
}
```

**Success Response (201)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "userId": "user_001",
  "type": "PROMOTION",
  "channel": "EMAIL",
  "title": "Special Offer",
  "content": "Get 20% off on all sandals this weekend!",
  "status": "SCHEDULED",
  "scheduledFor": "2025-01-21T18:00:00.000Z",
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

### POST /notifications/bulk
**Purpose**: Send bulk notifications to multiple users (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/notifications/bulk`  

**Request Body**:
```json
{
  "userIds": ["user_001", "user_002", "user_003"],
  "type": "PROMOTION",
  "channel": "EMAIL",
  "title": "New Collection Available",
  "content": "Check out our new summer collection!",
  "templateId": "collection_template",
  "templateData": {
    "collection": "summer_2025",
    "launchDate": "2025-01-25"
  }
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "notificationIds": [
    "65f1a2b3c4d5e6f7g8h9i0j1",
    "65f1a2b3c4d5e6f7g8h9i0j2",
    "65f1a2b3c4d5e6f7g8h9i0j3"
  ],
  "count": 3
}
```

### POST /notifications/segment
**Purpose**: Send notifications to user segments (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/notifications/segment`  

**Request Body**:
```json
{
  "segment": {
    "type": "USER_ATTRIBUTES",
    "criteria": {
      "totalOrders": { "$gte": 3 },
      "lastOrderDate": { "$gte": "2025-01-01" }
    }
  },
  "type": "LOYALTY",
  "channel": "EMAIL",
  "title": "Loyalty Reward",
  "content": "Thank you for being a loyal customer! Here's a special discount for you.",
  "templateId": "loyalty_template",
  "templateData": {
    "discountCode": "LOYALTY20",
    "discountAmount": "20%"
  }
}
```

### GET /notifications/admin/stats
**Purpose**: Get notification statistics (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/notifications/admin/stats`  

**Query Parameters**:
- `type` (string): Filter by notification type
- `channel` (string): Filter by channel
- `dateFrom` (string): Start date (ISO format)
- `dateTo` (string): End date (ISO format)

**Success Response (200)**:
```json
{
  "totalNotifications": 1250,
  "deliveryStats": {
    "sent": 1200,
    "delivered": 1150,
    "failed": 50,
    "deliveryRate": 95.83
  },
  "byType": {
    "ORDER": 450,
    "PROMOTION": 300,
    "WELCOME": 200,
    "SHIPPING": 200,
    "LOYALTY": 100
  },
  "byChannel": {
    "EMAIL": 800,
    "SMS": 250,
    "PUSH": 200
  },
  "performance": {
    "averageDeliveryTime": "2.5 minutes",
    "peakHours": ["10:00", "14:00", "18:00"],
    "bestPerformingType": "ORDER"
  }
}
```

## Public Webhooks

### POST /notifications/webhook/delivery
**Purpose**: Handle delivery webhook from email provider  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/notifications/webhook/delivery`  

**Request Body**: Provider webhook payload

**Success Response (200)**:
```json
{
  "success": true
}
```

### POST /notifications/webhook/opened
**Purpose**: Handle email opened webhook  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/notifications/webhook/opened`  

### POST /notifications/webhook/clicked
**Purpose**: Handle email clicked webhook  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/notifications/webhook/clicked`  

### POST /notifications/unsubscribe/:token
**Purpose**: Handle unsubscribe requests  
**Authentication**: None required (Public endpoint)  
**URL**: `http://localhost:3001/notifications/unsubscribe/abc123def456`  

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Successfully unsubscribed"
}
```

## Testing Endpoints (Admin Only)

### POST /notifications/test/send
**Purpose**: Send test notification (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/notifications/test/send`  

**Request Body**:
```json
{
  "userId": "user_001",
  "type": "WELCOME",
  "channel": "EMAIL",
  "title": "Test Notification",
  "content": "This is a test notification"
}
```

### POST /notifications/test/template
**Purpose**: Send test template notification (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/notifications/test/template`  

**Request Body**:
```json
{
  "userId": "user_001",
  "templateId": "welcome_template",
  "channel": "EMAIL",
  "templateData": {
    "userName": "John Doe",
    "welcomeMessage": "Welcome to our store!"
  }
}
```

---

# Reviews Endpoints

## Public Reviews

### GET /reviews/product/:productId
**Purpose**: Get reviews for a specific product  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/product/65f1a2b3c4d5e6f7g8h9i0j1`  

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `rating` (number): Filter by rating (1-5)
- `sortBy` (string): Sort by (newest, oldest, highest_rating, lowest_rating, most_helpful)
- `verifiedOnly` (boolean): Show only verified reviews
- `withPhotos` (boolean): Show only reviews with photos

**Success Response (200)**:
```json
{
  "reviews": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "userId": "user_001",
      "userName": "John Doe",
      "rating": 5,
      "title": "Excellent Quality",
      "comment": "These sandals are amazing! Very comfortable and stylish.",
      "photos": [
        "https://example.com/review1.jpg",
        "https://example.com/review2.jpg"
      ],
      "isVerified": true,
      "helpfulVotes": 12,
      "totalVotes": 15,
      "helpfulnessScore": 0.8,
      "status": "approved",
      "adminResponse": null,
      "createdAt": "2025-01-21T10:30:00.000Z",
      "updatedAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "totalPages": 5,
    "limit": 10
  },
  "summary": {
    "averageRating": 4.7,
    "totalReviews": 45,
    "ratingDistribution": {
      "5": 25,
      "4": 12,
      "3": 5,
      "2": 2,
      "1": 1
    },
    "verifiedPercentage": 85.5,
    "withPhotosPercentage": 60.0
  }
}
```

### GET /reviews/product/:productId/stats
**Purpose**: Get review statistics for a product  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/product/65f1a2b3c4d5e6f7g8h9i0j1/stats`  

**Success Response (200)**:
```json
{
  "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "totalReviews": 45,
  "averageRating": 4.7,
  "ratingDistribution": {
    "5": 25,
    "4": 12,
    "3": 5,
    "2": 2,
    "1": 1
  },
  "verifiedReviews": 38,
  "reviewsWithPhotos": 27,
  "recentReviews": 12,
  "helpfulReviews": 35,
  "responseRate": 85.5,
  "recommendationRate": 92.3
}
```

### GET /reviews/:reviewId
**Purpose**: Get a specific review by ID  
**Authentication**: None required (but user context used if authenticated)  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "userId": "user_001",
  "userName": "John Doe",
  "rating": 5,
  "title": "Excellent Quality",
  "comment": "These sandals are amazing! Very comfortable and stylish.",
  "photos": [
    "https://example.com/review1.jpg"
  ],
  "isVerified": true,
  "helpfulVotes": 12,
  "totalVotes": 15,
  "userVote": "helpful", // null if not authenticated or no vote
  "status": "approved",
  "adminResponse": {
    "message": "Thank you for your review!",
    "respondedAt": "2025-01-21T11:00:00.000Z"
  },
  "createdAt": "2025-01-21T10:30:00.000Z",
  "updatedAt": "2025-01-21T10:30:00.000Z"
}
```

## User Reviews

### GET /reviews/my-reviews
**Purpose**: Get current user's reviews  
**Authentication**: Required  
**URL**: `http://localhost:3001/reviews/my-reviews`  

**Query Parameters**:
- `limit` (number): Items per page (default: 10, max: 50)
- `offset` (number): Number of items to skip (default: 0)

**Success Response (200)**:
```json
{
  "reviews": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "rating": 5,
      "title": "Excellent Quality",
      "comment": "These sandals are amazing!",
      "photos": [],
      "status": "approved",
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 8,
  "limit": 10,
  "offset": 0
}
```

### GET /reviews/can-review/:productId
**Purpose**: Check if user can review a product  
**Authentication**: Required  
**URL**: `http://localhost:3001/reviews/can-review/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "canReview": true,
  "reason": "User has purchased this product and hasn't reviewed it yet",
  "purchaseDate": "2025-01-15T10:30:00.000Z",
  "orderNumber": "ORD-2025-001"
}
```

### POST /reviews
**Purpose**: Create a new review  
**Authentication**: Required  
**URL**: `http://localhost:3001/reviews`  

**Request Body**:
```json
{
  "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "orderId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "rating": 5,
  "title": "Excellent Quality",
  "comment": "These sandals are amazing! Very comfortable and stylish. Perfect for summer.",
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
  "title": "Excellent Quality",
  "comment": "These sandals are amazing! Very comfortable and stylish. Perfect for summer.",
  "photos": [
    "https://example.com/review1.jpg"
  ],
  "isVerified": true,
  "status": "pending",
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

### PUT /reviews/:reviewId
**Purpose**: Update an existing review  
**Authentication**: Required (Review author only)  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1`  

**Request Body**:
```json
{
  "rating": 4,
  "title": "Updated Review Title",
  "comment": "Updated review comment with more details",
  "photos": [
    "https://example.com/new-review1.jpg"
  ]
}
```

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "rating": 4,
  "title": "Updated Review Title",
  "comment": "Updated review comment with more details",
  "photos": [
    "https://example.com/new-review1.jpg"
  ],
  "status": "pending",
  "updatedAt": "2025-01-21T11:30:00.000Z"
}
```

### DELETE /reviews/:reviewId
**Purpose**: Delete a review  
**Authentication**: Required (Review author only)  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (204)**: No content

## Review Interactions

### POST /reviews/:reviewId/helpful
**Purpose**: Vote on review helpfulness  
**Authentication**: Required  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1/helpful`  

**Request Body**:
```json
{
  "helpful": true
}
```

**Success Response (200)**:
```json
{
  "message": "Vote recorded successfully",
  "helpfulVotes": 13,
  "totalVotes": 16,
  "userVote": "helpful"
}
```

### POST /reviews/:reviewId/flag
**Purpose**: Flag a review for moderation  
**Authentication**: Required  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1/flag`  

**Request Body**:
```json
{
  "reason": "INAPPROPRIATE_CONTENT",
  "description": "Contains offensive language"
}
```

**Success Response (200)**:
```json
{
  "message": "Review flagged successfully"
}
```

## Admin Reviews

### GET /reviews/admin/pending
**Purpose**: Get pending reviews for moderation (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/reviews/admin/pending`  

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Success Response (200)**:
```json
{
  "reviews": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "userId": "user_001",
      "userName": "John Doe",
      "rating": 5,
      "title": "Excellent Quality",
      "comment": "These sandals are amazing!",
      "status": "pending",
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "totalPages": 2
}
```

### GET /reviews/admin/flagged
**Purpose**: Get flagged reviews (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/reviews/admin/flagged`  

### PUT /reviews/admin/:reviewId/moderate
**Purpose**: Moderate a review (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/reviews/admin/65f1a2b3c4d5e6f7g8h9i0j1/moderate`  

**Request Body**:
```json
{
  "action": "APPROVE",
  "reason": "Review meets community guidelines",
  "adminNotes": "Approved after review"
}
```

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "status": "approved",
  "moderatedBy": "admin_001",
  "moderatedAt": "2025-01-21T11:30:00.000Z",
  "adminNotes": "Approved after review"
}
```

### POST /reviews/:reviewId/admin-response
**Purpose**: Add admin response to a review (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/reviews/65f1a2b3c4d5e6f7g8h9i0j1/admin-response`  

**Request Body**:
```json
{
  "message": "Thank you for your feedback! We're glad you enjoyed your purchase."
}
```

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "adminResponse": {
    "message": "Thank you for your feedback! We're glad you enjoyed your purchase.",
    "adminId": "admin_001",
    "adminName": "Admin User",
    "respondedAt": "2025-01-21T11:30:00.000Z"
  }
}
```

### PUT /reviews/admin/:reviewId/toggle-featured
**Purpose**: Toggle featured status of a review (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/reviews/admin/65f1a2b3c4d5e6f7g8h9i0j1/toggle-featured`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "isFeatured": true,
  "featuredAt": "2025-01-21T11:30:00.000Z"
}
```

## Review Filters and Search

### GET /reviews/search
**Purpose**: Search reviews  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/search`  

**Query Parameters**:
- `search` (string): Search query (required)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Success Response (200)**:
```json
{
  "reviews": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "rating": 5,
      "title": "Excellent Quality",
      "comment": "These sandals are amazing!",
      "status": "approved",
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "totalPages": 1
}
```

### GET /reviews/filter/rating/:rating
**Purpose**: Get reviews by specific rating  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/filter/rating/5`  

### GET /reviews/filter/verified
**Purpose**: Get only verified reviews  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/filter/verified`  

### GET /reviews/filter/with-photos
**Purpose**: Get reviews with photos  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/filter/with-photos`  

### GET /reviews/featured/all
**Purpose**: Get all featured reviews  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/featured/all`  

### GET /reviews/summary/recent
**Purpose**: Get recent reviews summary  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/summary/recent`  

**Query Parameters**:
- `limit` (number): Number of reviews (default: 5, max: 20)

### GET /reviews/summary/top-rated
**Purpose**: Get top rated reviews summary  
**Authentication**: None required  
**URL**: `http://localhost:3001/reviews/summary/top-rated`  

---

# Cart Endpoints

### GET /cart
**Purpose**: Get user's shopping cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart`  

**Success Response (200)**:
```json
{
  "userId": "user_001",
  "items": [
    {
      "_id": "item_001",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "productImage": "https://example.com/sandalias1.jpg",
      "price": 8999.99,
      "quantity": 2,
      "size": "38",
      "subtotal": 17999.98,
      "addedAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "summary": {
    "itemCount": 2,
    "subtotal": 17999.98,
    "tax": 0,
    "shipping": 0,
    "total": 17999.98
  },
  "lastUpdated": "2025-01-21T10:30:00.000Z"
}
```

### POST /cart/add
**Purpose**: Add item to cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/add`  

**Request Body**:
```json
{
  "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "quantity": 1,
  "size": "38"
}
```

**Success Response (201)**:
```json
{
  "message": "Item added to cart successfully",
  "cartItem": {
    "_id": "item_001",
    "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "quantity": 1,
    "size": "38",
    "addedAt": "2025-01-21T10:30:00.000Z"
  },
  "cartSummary": {
    "itemCount": 1,
    "total": 8999.99
  }
}
```

### PUT /cart/update/:itemId
**Purpose**: Update cart item quantity or size  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/update/item_001`  

**Request Body**:
```json
{
  "quantity": 3,
  "size": "39"
}
```

**Success Response (200)**:
```json
{
  "message": "Cart item updated successfully",
  "cartItem": {
    "_id": "item_001",
    "quantity": 3,
    "size": "39",
    "updatedAt": "2025-01-21T10:35:00.000Z"
  }
}
```

### DELETE /cart/remove/:itemId
**Purpose**: Remove item from cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/remove/item_001`  

**Success Response (200)**:
```json
{
  "message": "Item removed from cart successfully",
  "remainingItems": 1
}
```

### DELETE /cart/clear
**Purpose**: Clear entire cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/clear`  

**Success Response (200)**:
```json
{
  "message": "Cart cleared successfully"
}
```

### GET /cart/total
**Purpose**: Get cart total and summary  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/total`  

**Success Response (200)**:
```json
{
  "itemCount": 2,
  "subtotal": 17999.98,
  "tax": 0,
  "shipping": 0,
  "total": 17999.98,
  "currency": "ARS"
}
```

### GET /cart/summary
**Purpose**: Get detailed cart summary  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/summary`  

**Success Response (200)**:
```json
{
  "items": [
    {
      "_id": "item_001",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "price": 8999.99,
      "quantity": 2,
      "subtotal": 17999.98
    }
  ],
  "summary": {
    "itemCount": 2,
    "subtotal": 17999.98,
    "tax": 0,
    "shipping": 0,
    "total": 17999.98
  },
  "shippingOptions": [
    {
      "service": "standard",
      "name": "Envío Estándar",
      "cost": 2500,
      "estimatedDays": "3-5 días hábiles"
    }
  ]
}
```

### GET /cart/summary-with-discounts
**Purpose**: Get cart summary with discount calculations  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/summary-with-discounts?couponCode=WELCOME20`  

**Success Response (200)**:
```json
{
  "items": [
    {
      "_id": "item_001",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "price": 8999.99,
      "quantity": 2,
      "subtotal": 17999.98
    }
  ],
  "summary": {
    "itemCount": 2,
    "subtotal": 17999.98,
    "discounts": {
      "couponCode": "WELCOME20",
      "discountAmount": 3599.99,
      "discountType": "percentage",
      "discountValue": 20
    },
    "tax": 0,
    "shipping": 2500,
    "total": 16900.00
  },
  "appliedCoupons": [
    {
      "code": "WELCOME20",
      "discount": 3599.99,
      "description": "20% off first purchase"
    }
  ]
}
```

### POST /cart/apply-coupon
**Purpose**: Apply coupon code to cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/apply-coupon`  

**Request Body**:
```json
{
  "couponCode": "WELCOME20"
}
```

**Success Response (200)**:
```json
{
  "message": "Coupon applied successfully",
  "discount": {
    "code": "WELCOME20",
    "amount": 3599.99,
    "type": "percentage",
    "value": 20
  },
  "newTotal": 16900.00
}
```

### POST /cart/checkout
**Purpose**: Initiate checkout process from cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/checkout?returnUrl=http://localhost:3000/success&cancelUrl=http://localhost:3000/cancel`  

**Success Response (201)**:
```json
{
  "paymentId": "PAY-65f1a2b3c4d5e6f7g8h9i0j1",
  "approvalUrl": "https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=EC-1234567890",
  "orderId": "ORD-2025-001",
  "total": 16900.00,
  "currency": "ARS"
}
```

### GET /cart/validate
**Purpose**: Validate cart for checkout  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/validate`  

**Success Response (200)**:
```json
{
  "isValid": true,
  "issues": [],
  "summary": {
    "itemCount": 2,
    "total": 16900.00,
    "allItemsInStock": true,
    "shippingAvailable": true
  }
}
```

**Error Response (400)**:
```json
{
  "isValid": false,
  "issues": [
    {
      "type": "OUT_OF_STOCK",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "requestedQuantity": 5,
      "availableQuantity": 2
    }
  ]
}
```

### POST /cart/shipping/calculate
**Purpose**: Calculate shipping rates for cart contents  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/shipping/calculate`  

**Request Body**:
```json
{
  "destination": {
    "country": "MX",
    "postal_code": "44100",
    "state": "JAL",
    "city": "Guadalajara",
    "address": "Calle Independencia 456",
    "contact": {
      "name": "María López",
      "phone": "3339876543",
      "email": "maria.lopez@example.com"
    }
  }
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "rates": [
    {
      "id": "f9e9d82d-be82-41ce-bcc1-88a669191ecf",
      "carrier": "fedex",
      "service": "ground",
      "price": 290,
      "currency": "MXN",
      "days": "3 a 5 días",
      "serviceId": "fedex_mx_A-P16_ground"
    },
    {
      "id": "adf09812-f69a-4c37-9c3d-26453b6f4352",
      "carrier": "fedex",
      "service": "express",
      "price": 306,
      "currency": "MXN",
      "days": "1 a 2 días",
      "serviceId": "fedex_mx_A-P16_express"
    }
  ],
  "selectedRate": null
}
```

### POST /cart/shipping/address
**Purpose**: Set shipping address for cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/shipping/address`  

**Request Body**:
```json
{
  "country": "MX",
  "postal_code": "44100",
  "state": "JAL",
  "city": "Guadalajara",
  "address": "Calle Independencia 456",
  "contact": {
    "name": "María López",
    "phone": "3339876543",
    "email": "maria.lopez@example.com"
  }
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "shippingAddress": {
    "country": "MX",
    "postal_code": "44100",
    "state": "JAL",
    "city": "Guadalajara",
    "address": "Calle Independencia 456",
    "contact": {
      "name": "María López",
      "phone": "3339876543",
      "email": "maria.lopez@example.com"
    }
  },
  "message": "Shipping address updated successfully"
}
```

### POST /cart/shipping/select-rate
**Purpose**: Select a shipping rate for the cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/shipping/select-rate`  

**Request Body**:
```json
{
  "rateId": "f9e9d82d-be82-41ce-bcc1-88a669191ecf"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "selectedRate": {
    "rateId": "f9e9d82d-be82-41ce-bcc1-88a669191ecf",
    "carrier": "fedex",
    "service": "ground",
    "price": 290,
    "currency": "MXN",
    "days": "3 a 5 días",
    "serviceId": "fedex_mx_A-P16_ground"
  },
  "message": "Shipping rate selected successfully"
}
```

### GET /cart/with-shipping
**Purpose**: Get cart with shipping information  
**Authentication**: Required  
**URL**: `http://localhost:3001/cart/with-shipping`  

**Success Response (200)**:
```json
{
  "cart": {
    "items": [...],
    "shippingAddress": {
      "country": "MX",
      "postal_code": "44100",
      "state": "JAL",
      "city": "Guadalajara",
      "address": "Calle Independencia 456",
      "contact": {
        "name": "María López",
        "phone": "3339876543",
        "email": "maria.lopez@example.com"
      }
    },
    "selectedShippingRate": {
      "rateId": "f9e9d82d-be82-41ce-bcc1-88a669191ecf",
      "carrier": "fedex",
      "service": "ground",
      "price": 290,
      "currency": "MXN",
      "days": "3 a 5 días",
      "serviceId": "fedex_mx_A-P16_ground"
    }
  },
  "summary": {
    "subtotal": 5000.00,
    "shipping": 290.00,
    "tax": 846.40,
    "total": 6136.40
  },
  "shipping": {
    "rates": [...],
    "selectedRate": {...},
    "address": {...}
  }
}
```

---

# Shipping Endpoints

## Shipping Calculation

### POST /shipping/calculate
**Purpose**: Calculate shipping costs for specific items  
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
      "weight": 1.5,
      "dimensions": {
        "length": 30,
        "width": 20,
        "height": 10
      }
    }
  ],
  "customItems": [
    {
      "name": "Gift Box",
      "weight": 0.5,
      "dimensions": {
        "length": 25,
        "width": 15,
        "height": 8
      }
    }
  ]
}
```

**Success Response (200)**:
```json
{
  "address": {
    "id": "addr_001",
    "postalCode": "1234",
    "zone": "CABA"
  },
  "shippingOptions": [
    {
      "service": "standard",
      "name": "Envío Estándar",
      "cost": 2500,
      "estimatedDelivery": "3-5 días hábiles",
      "features": ["Seguimiento incluido", "Entrega en domicilio"]
    },
    {
      "service": "express",
      "name": "Envío Express",
      "cost": 4500,
      "estimatedDelivery": "24-48 horas",
      "features": ["Seguimiento incluido", "Entrega rápida"]
    }
  ],
  "totalWeight": 3.5,
  "totalDimensions": {
    "length": 30,
    "width": 20,
    "height": 10
  },
  "freeShippingEligible": false,
  "freeShippingThreshold": 15000,
  "currentCartValue": 8999.99
}
```

### POST /shipping/calculate/cart
**Purpose**: Calculate shipping from user's cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/calculate/cart?addressId=addr_001`  

**Success Response (200)**:
```json
{
  "address": {
    "id": "addr_001",
    "postalCode": "1234",
    "zone": "CABA"
  },
  "cartItems": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "quantity": 2,
      "weight": 1.5
    }
  ],
  "shippingOptions": [
    {
      "service": "standard",
      "name": "Envío Estándar",
      "cost": 2500,
      "estimatedDelivery": "3-5 días hábiles"
    }
  ],
  "freeShippingEligible": false,
  "freeShippingThreshold": 15000,
  "cartValue": 17999.98
}
```

### GET /shipping/zones/:postalCode
**Purpose**: Get zone information by postal code  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/zones/1234`  

**Success Response (200)**:
```json
{
  "postalCode": "1234",
  "zone": "CABA",
  "zoneName": "Ciudad Autónoma de Buenos Aires",
  "baseRate": 1500,
  "freeShippingThreshold": 15000,
  "estimatedDelivery": "1-2 días hábiles",
  "availableServices": ["standard", "express", "same_day"]
}
```

## Tracking

### GET /shipping/track/:trackingNumber
**Purpose**: Track shipment by tracking number (Public)  
**Authentication**: None required  
**URL**: `http://localhost:3001/shipping/track/TRK123456789`  

**Success Response (200)**:
```json
{
  "trackingNumber": "TRK123456789",
  "status": "IN_TRANSIT",
  "currentLocation": "Centro de Distribución Buenos Aires",
  "estimatedDelivery": "2025-01-23T14:00:00.000Z",
  "events": [
    {
      "date": "2025-01-21T10:30:00.000Z",
      "status": "PICKED_UP",
      "location": "Centro de Distribución Buenos Aires",
      "description": "Paquete recogido del vendedor"
    },
    {
      "date": "2025-01-21T16:45:00.000Z",
      "status": "IN_TRANSIT",
      "location": "En camino a destino",
      "description": "Paquete en tránsito"
    }
  ],
  "service": "standard",
  "estimatedDeliveryDate": "2025-01-23T14:00:00.000Z"
}
```

### GET /shipping/track/order/:orderId
**Purpose**: Track shipment by order ID  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/track/order/ORD-2025-001`  

**Success Response (200)**:
```json
{
  "orderId": "ORD-2025-001",
  "trackingNumber": "TRK123456789",
  "status": "DELIVERED",
  "deliveredAt": "2025-01-23T14:30:00.000Z",
  "recipient": "John Doe",
  "service": "standard",
  "events": [
    {
      "date": "2025-01-21T10:30:00.000Z",
      "status": "PICKED_UP",
      "location": "Centro de Distribución Buenos Aires",
      "description": "Paquete recogido del vendedor"
    },
    {
      "date": "2025-01-23T14:30:00.000Z",
      "status": "DELIVERED",
      "location": "Buenos Aires, Argentina",
      "description": "Paquete entregado al destinatario"
    }
  ]
}
```

### GET /shipping/my-shipments
**Purpose**: Get user's shipment history  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/my-shipments?limit=10&offset=0`  

**Success Response (200)**:
```json
{
  "shipments": [
    {
      "orderId": "ORD-2025-001",
      "trackingNumber": "TRK123456789",
      "status": "DELIVERED",
      "service": "standard",
      "shippedAt": "2025-01-21T10:30:00.000Z",
      "deliveredAt": "2025-01-23T14:30:00.000Z",
      "totalCost": 2500
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

## Address Validation

### POST /shipping/validate-address
**Purpose**: Validate shipping address  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/validate-address`  

**Request Body**:
```json
{
  "street": "Av. Corrientes 1234",
  "city": "Buenos Aires",
  "postalCode": "1043",
  "province": "CABA",
  "country": "Argentina"
}
```

**Success Response (200)**:
```json
{
  "isValid": true,
  "normalizedAddress": {
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "postalCode": "1043",
    "province": "CABA",
    "country": "Argentina"
  },
  "zone": "CABA",
  "deliveryOptions": [
    {
      "service": "standard",
      "estimatedDays": "1-2 días hábiles"
    },
    {
      "service": "express",
      "estimatedDays": "24 horas"
    }
  ]
}
```

### GET /shipping/delivery-estimate
**Purpose**: Get delivery estimate for service and zone  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/delivery-estimate?service=standard&zone=CABA`  

**Success Response (200)**:
```json
{
  "service": "standard",
  "zone": "CABA",
  "estimatedDeliveryDate": "2025-01-23T14:00:00.000Z",
  "estimatedDays": "2 días hábiles",
  "businessDaysOnly": true
}
```

## Shipping Information

### GET /shipping/services
**Purpose**: Get available shipping services  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/services?zone=CABA`  

**Success Response (200)**:
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
    },
    {
      "id": "express",
      "name": "Envío Express",
      "description": "Entrega en 24-48 horas",
      "features": ["Seguimiento incluido", "Entrega rápida"],
      "maxWeight": 20,
      "maxDimensions": {
        "length": 80,
        "width": 80,
        "height": 80
      },
      "availableIn": ["CABA", "GBA", "INTERIOR"]
    }
  ]
}
```

### GET /shipping/coverage
**Purpose**: Get shipping coverage information  
**Authentication**: Required  
**URL**: `http://localhost:3001/shipping/coverage`  

**Success Response (200)**:
```json
{
  "zones": [
    {
      "id": "CABA",
      "name": "Ciudad Autónoma de Buenos Aires",
      "postalCodeRange": "1000-1499",
      "estimatedDelivery": "1-2 días hábiles",
      "services": ["standard", "express", "same_day"]
    },
    {
      "id": "GBA",
      "name": "Gran Buenos Aires",
      "postalCodeRange": "1600-1900",
      "estimatedDelivery": "2-3 días hábiles",
      "services": ["standard", "express"]
    },
    {
      "id": "INTERIOR",
      "name": "Interior del País",
      "postalCodeRange": "Resto del país",
      "estimatedDelivery": "3-7 días hábiles",
      "services": ["standard", "express"]
    }
  ]
}
```

## Admin Shipping

### GET /shipping/admin/statistics
**Purpose**: Get shipping statistics (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/shipping/admin/statistics?dateFrom=2025-01-01&dateTo=2025-01-31`  

**Success Response (200)**:
```json
{
  "totalShipments": 1250,
  "deliveredShipments": 1180,
  "pendingShipments": 45,
  "failedShipments": 25,
  "deliveryRate": 94.4,
  "averageDeliveryTime": "2.8 días",
  "byService": {
    "standard": 800,
    "express": 350,
    "same_day": 100
  },
  "byZone": {
    "CABA": 600,
    "GBA": 400,
    "INTERIOR": 250
  },
  "performance": {
    "onTimeDelivery": 92.5,
    "customerSatisfaction": 4.7
  }
}
```

### GET /shipping/admin/performance
**Purpose**: Get delivery performance metrics (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/shipping/admin/performance`  

### POST /shipping/admin/update-tracking
**Purpose**: Force tracking update for all active shipments (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/shipping/admin/update-tracking`  

**Success Response (200)**:
```json
{
  "message": "Tracking update initiated",
  "updatedCount": 45
}
```

## Shipping Webhooks

### POST /shipping/webhooks/status-update
**Purpose**: Handle shipping status update webhook (Public)  
**Authentication**: None required  
**URL**: `http://localhost:3001/shipping/webhooks/status-update`  

**Request Body**: DrEnvío webhook payload

**Success Response (200)**:
```json
{
  "status": "received"
}
```

### POST /shipping/webhooks/delivered
**Purpose**: Handle delivery confirmation webhook (Public)  
**Authentication**: None required  
**URL**: `http://localhost:3001/shipping/webhooks/delivered`  

### POST /shipping/webhooks/exception
**Purpose**: Handle shipping exception webhook (Public)  
**Authentication**: None required  
**URL**: `http://localhost:3001/shipping/webhooks/exception`  

---

# Promotions Endpoints

## Public Promotions

### GET /promotions/active
**Purpose**: Get active promotions  
**Authentication**: None required  
**URL**: `http://localhost:3001/promotions/active`  

**Success Response (200)**:
```json
{
  "promotions": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Summer Sale",
      "description": "Get 20% off on all summer items",
      "type": "PERCENTAGE",
      "value": 20,
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-03-31T23:59:59.000Z",
      "conditions": {
        "minOrderValue": 10000,
        "applicableCategories": ["sandalias", "zapatillas"],
        "maxUsagePerUser": 1
      },
      "isActive": true,
      "bannerImage": "https://example.com/summer-sale-banner.jpg"
    }
  ],
  "total": 3
}
```

### GET /promotions/coupons/public
**Purpose**: Get public coupon codes  
**Authentication**: None required  
**URL**: `http://localhost:3001/promotions/coupons/public`  

**Success Response (200)**:
```json
{
  "coupons": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "code": "WELCOME20",
      "name": "Welcome Discount",
      "description": "20% off your first purchase",
      "type": "PERCENTAGE",
      "value": 20,
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.000Z",
      "conditions": {
        "minOrderValue": 5000,
        "maxUsagePerUser": 1,
        "newUsersOnly": true
      },
      "isActive": true,
      "usageCount": 45,
      "usageLimit": 1000
    }
  ],
  "total": 5
}
```

### GET /promotions/category/:category
**Purpose**: Get promotions for specific category  
**Authentication**: None required  
**URL**: `http://localhost:3001/promotions/category/sandalias`  

**Success Response (200)**:
```json
{
  "promotions": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Sandals Special",
      "description": "15% off on all sandals",
      "type": "PERCENTAGE",
      "value": 15,
      "category": "sandalias",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-02-28T23:59:59.000Z",
      "isActive": true
    }
  ],
  "category": "sandalias",
  "total": 1
}
```

## Coupon Application

### POST /promotions/apply-coupon
**Purpose**: Apply coupon code to cart  
**Authentication**: Required  
**URL**: `http://localhost:3001/promotions/apply-coupon`  

**Request Body**:
```json
{
  "couponCode": "WELCOME20",
  "cartItems": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "quantity": 2,
      "price": 8999.99,
      "category": "sandalias"
    }
  ],
  "totalAmount": 17999.98
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "coupon": {
    "code": "WELCOME20",
    "name": "Welcome Discount",
    "type": "PERCENTAGE",
    "value": 20,
    "discountAmount": 3599.99
  },
  "discount": {
    "amount": 3599.99,
    "type": "PERCENTAGE",
    "appliedTo": "total"
  },
  "newTotal": 14400.00,
  "originalTotal": 17999.98
}
```

### POST /promotions/apply-discount
**Purpose**: Apply automatic discount based on conditions  
**Authentication**: Required  
**URL**: `http://localhost:3001/promotions/apply-discount`  

**Request Body**:
```json
{
  "cartItems": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "quantity": 2,
      "price": 8999.99,
      "category": "sandalias"
    }
  ],
  "totalAmount": 17999.98,
  "userId": "user_001"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "appliedPromotions": [
    {
      "promotionId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Summer Sale",
      "type": "PERCENTAGE",
      "value": 20,
      "discountAmount": 3599.99
    }
  ],
  "totalDiscount": 3599.99,
  "newTotal": 14400.00,
  "originalTotal": 17999.98
}
```

## Admin Promotions

### POST /promotions
**Purpose**: Create new promotion (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/promotions`  

**Request Body**:
```json
{
  "name": "Black Friday Sale",
  "description": "50% off on all items",
  "type": "PERCENTAGE",
  "value": 50,
  "startDate": "2025-11-24T00:00:00.000Z",
  "endDate": "2025-11-30T23:59:59.000Z",
  "conditions": {
    "minOrderValue": 20000,
    "applicableCategories": ["sandalias", "zapatillas", "botas", "plataformas"],
    "maxUsagePerUser": 1,
    "maxUsageTotal": 10000
  },
  "bannerImage": "https://example.com/black-friday-banner.jpg",
  "isActive": true
}
```

**Success Response (201)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "name": "Black Friday Sale",
  "description": "50% off on all items",
  "type": "PERCENTAGE",
  "value": 50,
  "startDate": "2025-11-24T00:00:00.000Z",
  "endDate": "2025-11-30T23:59:59.000Z",
  "conditions": {
    "minOrderValue": 20000,
    "applicableCategories": ["sandalias", "zapatillas", "botas", "plataformas"],
    "maxUsagePerUser": 1,
    "maxUsageTotal": 10000
  },
  "isActive": true,
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

### GET /promotions/admin/all
**Purpose**: Get all promotions with admin filters (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/promotions/admin/all?status=active&type=PERCENTAGE&limit=20&offset=0`  

**Success Response (200)**:
```json
{
  "promotions": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Black Friday Sale",
      "description": "50% off on all items",
      "type": "PERCENTAGE",
      "value": 50,
      "status": "active",
      "startDate": "2025-11-24T00:00:00.000Z",
      "endDate": "2025-11-30T23:59:59.000Z",
      "usageCount": 1250,
      "usageLimit": 10000,
      "isActive": true,
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 8,
  "limit": 20,
  "offset": 0
}
```

### GET /promotions/admin/stats
**Purpose**: Get promotion statistics (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/promotions/admin/stats?dateFrom=2025-01-01&dateTo=2025-01-31`  

**Success Response (200)**:
```json
{
  "totalPromotions": 15,
  "activePromotions": 8,
  "expiredPromotions": 5,
  "scheduledPromotions": 2,
  "totalUsage": 5420,
  "totalDiscountGiven": 125000.50,
  "averageDiscountPerOrder": 23.05,
  "topPromotions": [
    {
      "promotionId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Summer Sale",
      "usageCount": 2150,
      "totalDiscount": 45000.00
    }
  ],
  "byType": {
    "PERCENTAGE": 10,
    "FIXED_AMOUNT": 3,
    "FREE_SHIPPING": 2
  },
  "byCategory": {
    "sandalias": 5,
    "zapatillas": 4,
    "botas": 3,
    "plataformas": 3
  }
}
```

### POST /promotions/coupons
**Purpose**: Create new coupon (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/promotions/coupons`  

**Request Body**:
```json
{
  "code": "NEWUSER30",
  "name": "New User Special",
  "description": "30% off for new users",
  "type": "PERCENTAGE",
  "value": 30,
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z",
  "conditions": {
    "minOrderValue": 8000,
    "maxUsagePerUser": 1,
    "newUsersOnly": true,
    "maxUsageTotal": 5000
  },
  "isActive": true,
  "isPublic": true
}
```

**Success Response (201)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "code": "NEWUSER30",
  "name": "New User Special",
  "description": "30% off for new users",
  "type": "PERCENTAGE",
  "value": 30,
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z",
  "conditions": {
    "minOrderValue": 8000,
    "maxUsagePerUser": 1,
    "newUsersOnly": true,
    "maxUsageTotal": 5000
  },
  "isActive": true,
  "isPublic": true,
  "usageCount": 0,
  "createdAt": "2025-01-21T10:30:00.000Z"
}
```

### PUT /promotions/:id
**Purpose**: Update promotion (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/promotions/65f1a2b3c4d5e6f7g8h9i0j1`  

**Request Body**:
```json
{
  "name": "Updated Black Friday Sale",
  "description": "60% off on all items - Extended!",
  "value": 60,
  "endDate": "2025-12-05T23:59:59.000Z"
}
```

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "name": "Updated Black Friday Sale",
  "description": "60% off on all items - Extended!",
  "type": "PERCENTAGE",
  "value": 60,
  "endDate": "2025-12-05T23:59:59.000Z",
  "updatedAt": "2025-01-21T11:30:00.000Z"
}
```

### DELETE /promotions/:id
**Purpose**: Delete promotion (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/promotions/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "message": "Promotion deleted successfully"
}
```

### PUT /promotions/:id/toggle
**Purpose**: Toggle promotion active status (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/promotions/65f1a2b3c4d5e6f7g8h9i0j1/toggle`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "isActive": false,
  "updatedAt": "2025-01-21T11:30:00.000Z"
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
  "overview": {
    "totalUsers": 1250,
    "totalProducts": 89,
    "totalOrders": 5420,
    "totalRevenue": 1250000.50,
    "todayUsers": 45,
    "todayOrders": 125,
    "todayRevenue": 45000.00,
    "monthlyUsers": 850,
    "monthlyOrders": 2100,
    "monthlyRevenue": 450000.00
  },
  "recentActivity": {
    "newUsers": 12,
    "newOrders": 45,
    "pendingReviews": 8,
    "lowStockProducts": 5
  },
  "topProducts": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Sandalias de Cuero Premium",
      "sales": 125,
      "revenue": 1125000.00
    }
  ],
  "orderStatus": {
    "pending": 25,
    "processing": 18,
    "shipped": 45,
    "delivered": 2100,
    "cancelled": 12
  },
  "revenue": {
    "today": 45000.00,
    "thisWeek": 280000.00,
    "thisMonth": 450000.00,
    "lastMonth": 380000.00
  }
}
```

### GET /admin/users
**Purpose**: Get all users with admin filters (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/users?limit=20&offset=0&role=user&status=active`  

**Success Response (200)**:
```json
{
  "users": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "isActive": true,
      "totalOrders": 5,
      "totalSpent": 45000.00,
      "lastOrderDate": "2025-01-15T10:30:00.000Z",
      "createdAt": "2025-01-01T10:30:00.000Z"
    }
  ],
  "total": 1250,
  "limit": 20,
  "offset": 0
}
```

### GET /admin/users/:id
**Purpose**: Get specific user details (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/users/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "role": "user",
  "isActive": true,
  "addresses": [
    {
      "_id": "addr_001",
      "street": "Av. Corrientes 1234",
      "city": "Buenos Aires",
      "postalCode": "1043",
      "isDefault": true
    }
  ],
  "orderHistory": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "orderNumber": "ORD-2025-001",
      "status": "delivered",
      "total": 8999.99,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "statistics": {
    "totalOrders": 5,
    "totalSpent": 45000.00,
    "averageOrderValue": 9000.00,
    "lastOrderDate": "2025-01-15T10:30:00.000Z",
    "favoriteCategory": "sandalias"
  },
  "createdAt": "2025-01-01T10:30:00.000Z"
}
```

### PUT /admin/users/:id/role
**Purpose**: Update user role (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/users/65f1a2b3c4d5e6f7g8h9i0j1/role`  

**Request Body**:
```json
{
  "role": "admin"
}
```

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "role": "admin",
  "updatedAt": "2025-01-21T11:30:00.000Z"
}
```

### DELETE /admin/users/:id
**Purpose**: Delete user (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/users/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "message": "User deleted successfully"
}
```

### GET /admin/products
**Purpose**: Get all products with admin filters (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/products?limit=20&offset=0&category=sandalias&status=active`  

**Success Response (200)**:
```json
{
  "products": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Sandalias de Cuero Premium",
      "price": 8999.99,
      "category": "sandalias",
      "stock": 25,
      "isActive": true,
      "isFeatured": true,
      "isPreorder": false,
      "totalSales": 125,
      "totalRevenue": 1125000.00,
      "averageRating": 4.7,
      "reviewCount": 45,
      "createdAt": "2025-01-01T10:30:00.000Z"
    }
  ],
  "total": 89,
  "limit": 20,
  "offset": 0
}
```

### GET /admin/products/:id
**Purpose**: Get specific product details (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/products/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "name": "Sandalias de Cuero Premium",
  "description": "Sandalias elegantes de cuero italiano",
  "price": 8999.99,
  "category": "sandalias",
  "sizes": ["35", "36", "37", "38", "39", "40"],
  "images": [
    "https://example.com/sandalias1.jpg"
  ],
  "stock": 25,
  "isActive": true,
  "isFeatured": true,
  "isPreorder": false,
  "sales": {
    "totalSales": 125,
    "totalRevenue": 1125000.00,
    "thisMonth": 15,
    "lastMonth": 20
  },
  "reviews": {
    "averageRating": 4.7,
    "totalReviews": 45,
    "ratingDistribution": {
      "5": 25,
      "4": 12,
      "3": 5,
      "2": 2,
      "1": 1
    }
  },
  "createdAt": "2025-01-01T10:30:00.000Z",
  "updatedAt": "2025-01-21T10:30:00.000Z"
}
```

### GET /admin/orders
**Purpose**: Get all orders with admin filters (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/orders?limit=20&offset=0&status=pending&dateFrom=2025-01-01&dateTo=2025-01-31`  

**Success Response (200)**:
```json
{
  "orders": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "orderNumber": "ORD-2025-001",
      "userId": "user_001",
      "userName": "John Doe",
      "userEmail": "john.doe@example.com",
      "status": "pending",
      "total": 17999.98,
      "items": [
        {
          "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
          "productName": "Sandalias de Cuero Premium",
          "quantity": 2,
          "price": 8999.99,
          "subtotal": 17999.98
        }
      ],
      "shippingAddress": {
        "street": "Av. Corrientes 1234",
        "city": "Buenos Aires",
        "postalCode": "1043"
      },
      "paymentStatus": "pending",
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 5420,
  "limit": 20,
  "offset": 0
}
```

### GET /admin/orders/:id
**Purpose**: Get specific order details (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/orders/65f1a2b3c4d5e6f7g8h9i0j1`  

**Success Response (200)**:
```json
{
  "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "orderNumber": "ORD-2025-001",
  "userId": "user_001",
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+54 11 1234-5678"
  },
  "status": "pending",
  "total": 17999.98,
  "subtotal": 17999.98,
  "tax": 0,
  "shipping": 2500,
  "discount": 0,
  "items": [
    {
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "quantity": 2,
      "price": 8999.99,
      "subtotal": 17999.98,
      "size": "38"
    }
  ],
  "shippingAddress": {
    "street": "Av. Corrientes 1234",
    "city": "Buenos Aires",
    "postalCode": "1043",
    "province": "CABA",
    "country": "Argentina"
  },
  "payment": {
    "method": "paypal",
    "status": "pending",
    "transactionId": "PAY-1234567890",
    "amount": 17999.98
  },
  "shipping": {
    "method": "standard",
    "trackingNumber": "TRK123456789",
    "estimatedDelivery": "2025-01-25T14:00:00.000Z"
  },
  "timeline": [
    {
      "status": "pending",
      "timestamp": "2025-01-21T10:30:00.000Z",
      "description": "Order placed"
    }
  ],
  "createdAt": "2025-01-21T10:30:00.000Z",
  "updatedAt": "2025-01-21T10:30:00.000Z"
}
```

### GET /admin/payments
**Purpose**: Get all payments with admin filters (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/payments?limit=20&offset=0&status=completed&method=paypal`  

**Success Response (200)**:
```json
{
  "payments": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "paymentId": "PAY-1234567890",
      "userId": "user_001",
      "userName": "John Doe",
      "orderId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "orderNumber": "ORD-2025-001",
      "method": "paypal",
      "status": "completed",
      "amount": 17999.98,
      "currency": "ARS",
      "transactionId": "EC-1234567890",
      "createdAt": "2025-01-21T10:30:00.000Z",
      "completedAt": "2025-01-21T10:35:00.000Z"
    }
  ],
  "total": 5420,
  "limit": 20,
  "offset": 0
}
```

### GET /admin/reviews
**Purpose**: Get all reviews with admin filters (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/reviews?limit=20&offset=0&status=pending&rating=5`  

**Success Response (200)**:
```json
{
  "reviews": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
      "productName": "Sandalias de Cuero Premium",
      "userId": "user_001",
      "userName": "John Doe",
      "rating": 5,
      "title": "Excellent Quality",
      "comment": "These sandals are amazing!",
      "status": "pending",
      "isVerified": true,
      "helpfulVotes": 12,
      "createdAt": "2025-01-21T10:30:00.000Z"
    }
  ],
  "total": 1250,
  "limit": 20,
  "offset": 0
}
```

### GET /admin/promotions
**Purpose**: Get all promotions with admin filters (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/promotions?limit=20&offset=0&status=active&type=PERCENTAGE`  

**Success Response (200)**:
```json
{
  "promotions": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Summer Sale",
      "description": "Get 20% off on all summer items",
      "type": "PERCENTAGE",
      "value": 20,
      "status": "active",
      "usageCount": 1250,
      "usageLimit": 10000,
      "totalDiscountGiven": 45000.00,
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-03-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2025-01-01T10:30:00.000Z"
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

### GET /admin/statistics
**Purpose**: Get comprehensive admin statistics (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/statistics?dateFrom=2025-01-01&dateTo=2025-01-31`  

**Success Response (200)**:
```json
{
  "period": {
    "from": "2025-01-01T00:00:00.000Z",
    "to": "2025-01-31T23:59:59.000Z"
  },
  "users": {
    "total": 1250,
    "newThisPeriod": 850,
    "activeUsers": 950,
    "growth": 12.5
  },
  "products": {
    "total": 89,
    "active": 85,
    "lowStock": 5,
    "outOfStock": 2,
    "topSelling": [
      {
        "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
        "name": "Sandalias de Cuero Premium",
        "sales": 125,
        "revenue": 1125000.00
      }
    ]
  },
  "orders": {
    "total": 5420,
    "thisPeriod": 2100,
    "averageOrderValue": 8500.00,
    "conversionRate": 3.2,
    "byStatus": {
      "pending": 25,
      "processing": 18,
      "shipped": 45,
      "delivered": 2000,
      "cancelled": 12
    }
  },
  "revenue": {
    "total": 1250000.50,
    "thisPeriod": 450000.00,
    "lastPeriod": 380000.00,
    "growth": 18.4,
    "averageOrderValue": 8500.00,
    "byPaymentMethod": {
      "paypal": 65,
      "mercadopago": 35
    }
  },
  "reviews": {
    "total": 1250,
    "averageRating": 4.6,
    "pendingModeration": 8,
    "thisPeriod": 450
  },
  "promotions": {
    "total": 15,
    "active": 8,
    "totalDiscountGiven": 125000.50,
    "topPromotion": {
      "name": "Summer Sale",
      "usageCount": 1250,
      "discountGiven": 45000.00
    }
  }
}
```

### GET /admin/analytics
**Purpose**: Get detailed analytics and metrics (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/analytics?metric=sales&period=monthly&dateFrom=2025-01-01&dateTo=2025-01-31`  

**Success Response (200)**:
```json
{
  "metric": "sales",
  "period": "monthly",
  "data": [
    {
      "date": "2025-01-01",
      "value": 15000.00,
      "orders": 18
    },
    {
      "date": "2025-01-02",
      "value": 22000.00,
      "orders": 25
    }
  ],
  "summary": {
    "total": 450000.00,
    "average": 14516.13,
    "growth": 18.4,
    "peakDay": "2025-01-15",
    "peakValue": 35000.00
  }
}
```

### GET /admin/reports
**Purpose**: Generate admin reports (Admin only)  
**Authentication**: Required (Admin role)  
**URL**: `http://localhost:3001/admin/reports?type=sales&format=json&dateFrom=2025-01-01&dateTo=2025-01-31`  

**Success Response (200)**:
```json
{
  "report": {
    "type": "sales",
    "period": {
      "from": "2025-01-01T00:00:00.000Z",
      "to": "2025-01-31T23:59:59.000Z"
    },
    "summary": {
      "totalRevenue": 450000.00,
      "totalOrders": 2100,
      "averageOrderValue": 214.29,
      "topProducts": [
        {
          "productId": "65f1a2b3c4d5e6f7g8h9i0j1",
          "name": "Sandalias de Cuero Premium",
          "sales": 125,
          "revenue": 1125000.00
        }
      ],
      "salesByDay": [
        {
          "date": "2025-01-01",
          "revenue": 15000.00,
          "orders": 18
        }
      ]
    },
    "generatedAt": "2025-01-21T11:30:00.000Z"
  }
}
```

---

# Testing Commands (cURL)

## Complete Flow Testing

### Step 1: Test Google Places API (Optional)
```bash
# Search for places in Mexico
curl -X GET "http://localhost:3001/location/search?q=Guadalajara" \
  -H "Content-Type: application/json"

# Get place details
curl -X GET "http://localhost:3001/location/details?placeId=288739709" \
  -H "Content-Type: application/json"
```

### Step 2: User Registration/Login
```bash
# Register new user
curl -X POST "http://localhost:3001/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Or login existing user
curl -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Step 3: Get Available Products
```bash
curl -X GET "http://localhost:3001/products" \
  -H "Content-Type: application/json"
```

### Step 4: Add Product to Cart
```bash
# Replace PRODUCT_ID with actual ID from previous response
curl -X POST "http://localhost:3001/cart/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "quantity": 1,
    "size": "38"
  }'
```

### Step 5: Set Shipping Address
```bash
curl -X POST "http://localhost:3001/cart/shipping/address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "country": "MX",
    "postal_code": "44100",
    "state": "JAL",
    "city": "Guadalajara",
    "address": "Calle Independencia 456, Centro, Guadalajara, JAL",
    "contact": {
      "name": "María López",
      "phone": "3339876543",
      "email": "maria.lopez@example.com"
    }
  }'
```

### Step 6: Calculate Shipping Options
```bash
curl -X POST "http://localhost:3001/cart/shipping/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "destination": {
      "country": "MX",
      "postal_code": "44100",
      "state": "JAL",
      "city": "Guadalajara",
      "address": "Calle Independencia 456, Centro, Guadalajara, JAL",
      "contact": {
        "name": "María López",
        "phone": "3339876543",
        "email": "maria.lopez@example.com"
      }
    }
  }'
```

### Step 7: Select Shipping Rate
```bash
# Use rateId from previous response (e.g., f9e9d82d-be82-41ce-bcc1-88a669191ecf)
curl -X POST "http://localhost:3001/cart/shipping/select-rate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "rateId": "RATE_ID_FROM_PREVIOUS_RESPONSE"
  }'
```

### Step 8: View Cart with Shipping
```bash
curl -X GET "http://localhost:3001/cart/with-shipping" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 9: Create Order with Shipping
```bash
curl -X POST "http://localhost:3001/orders/with-shipping" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "notes": "Please handle with care"
  }'
```

### Step 10: Check Shipping Status
```bash
# Use orderId from previous response
curl -X GET "http://localhost:3001/orders/my-orders/ORDER_ID_HERE/shipping-status" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 11: View All Orders
```bash
curl -X GET "http://localhost:3001/orders/my-orders" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Automated Testing Script

```bash
#!/bin/bash
# Complete flow testing script

BASE_URL="http://localhost:3001"
echo "🚀 Starting complete flow test..."

# 1. Login
echo "📝 Step 1: Login..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.access_token')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Error: Could not get token"
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."

# 2. Get products
echo "📦 Step 2: Getting products..."
PRODUCTS=$(curl -s -X GET "$BASE_URL/products" | jq '.products[0]._id')
echo "✅ Product found: $PRODUCTS"

# 3. Add to cart
echo "🛒 Step 3: Adding to cart..."
curl -s -X POST "$BASE_URL/cart/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"productId\": $PRODUCTS, \"quantity\": 1}" > /dev/null
echo "✅ Product added to cart"

# 4. Set shipping address
echo "📍 Step 4: Setting shipping address..."
curl -s -X POST "$BASE_URL/cart/shipping/address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "country": "MX",
    "postal_code": "44100",
    "state": "JAL",
    "city": "Guadalajara",
    "address": "Calle Independencia 456",
    "contact": {
      "name": "María López",
      "phone": "3339876543",
      "email": "maria.lopez@example.com"
    }
  }' > /dev/null
echo "✅ Address configured"

# 5. Calculate shipping
echo "💰 Step 5: Calculating shipping costs..."
SHIPPING_RESPONSE=$(curl -s -X POST "$BASE_URL/cart/shipping/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "destination": {
      "country": "MX",
      "postal_code": "44100",
      "state": "JAL",
      "city": "Guadalajara",
      "address": "Calle Independencia 456",
      "contact": {
        "name": "María López",
        "phone": "3339876543",
        "email": "maria.lopez@example.com"
      }
    }
  }')

echo "✅ Shipping response:"
echo "$SHIPPING_RESPONSE" | jq '.'

# 6. Select shipping rate
echo "📋 Step 6: Selecting shipping option..."
RATE_ID=$(echo "$SHIPPING_RESPONSE" | jq -r '.rates[0].id')
curl -s -X POST "$BASE_URL/cart/shipping/select-rate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"rateId\": \"$RATE_ID\"}" > /dev/null
echo "✅ Shipping selected: $RATE_ID"

# 7. Create order
echo "📦 Step 7: Creating order with shipping..."
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/orders/with-shipping" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"notes": "Please handle with care"}')

echo "✅ Order created:"
echo "$ORDER_RESPONSE" | jq '.'

echo "🎉 Complete flow tested successfully!"
```

## Environment Variables

Make sure to set these environment variables in your `.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/nabra_xr

# JWT
JWT_SECRET=your_jwt_secret_here

# OpenStreetMap Nominatim API (Free - No API Key Required)
# Uses OpenStreetMap Nominatim service for location searches
# No configuration needed - completely free service

# Drenvio API
DRENVIO_API_KEY=your_drenvio_api_key_here
DRENVIO_SECRET_KEY=your_drenvio_secret_key_here
DRENVIO_API_URL=https://prod.api-drenvio.com

# Company Information
COMPANY_RFC=NABX123456XXX
COMPANY_NAME=Nabra XR
COMPANY_PHONE=+52 55 1234-5678
COMPANY_EMAIL=envios@nabraxr.com

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=your_mercadopago_access_token
MERCADOPAGO_PUBLIC_KEY=your_mercadopago_public_key
```

## What You Should See

1. **OpenStreetMap Nominatim API working** (completely free, no API key needed)
2. **Accurate location searches** for Mexican cities and addresses
3. **FedEx and Estafeta quotes** with real prices
4. **Successful shipping rate selection**
5. **Order created** with all costs included
6. **Shipment created** automatically in Drenvio
7. **Tracking number** generated
