# 👤 API de Perfil de Usuario - Sistema Completo

## 📋 Descripción General

Sistema completo de gestión de perfiles de usuario diseñado para e-commerce con integración a DrEnvío. Incluye información personal, direcciones, contactos de emergencia, verificaciones y preferencias.

---

## 🏗️ Estructura del Sistema

### 📊 Esquemas Principales

#### 1. **UserProfile** - Perfil Principal
- Información personal completa
- Documentos de identidad
- Números de teléfono
- Contactos de emergencia
- Preferencias del usuario
- Verificaciones de seguridad
- Estadísticas del usuario

#### 2. **Address** - Direcciones de Envío
- Múltiples direcciones por usuario
- Tipos: casa, trabajo, facturación, envío
- Integración con DrEnvío
- Coordenadas GPS
- Validación de zonas de entrega

---

## 🔗 Endpoints de la API

### 📝 **GESTIÓN DE PERFIL**

#### `GET /profile`
Obtener perfil completo del usuario
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `PUT /profile`
Actualizar información del perfil
```bash
curl -X PUT "https://9dbdcf7272a6.ngrok-free.app/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "nationality": "Argentina",
    "phoneNumbers": [{
      "countryCode": "+54",
      "number": "1123456789",
      "type": "mobile",
      "isPrimary": true,
      "label": "Personal"
    }],
    "documents": [{
      "type": "dni",
      "number": "12345678",
      "issuingCountry": "Argentina"
    }],
    "emergencyContacts": [{
      "name": "María Pérez",
      "relationship": "Madre",
      "phone": {
        "countryCode": "+54",
        "number": "1187654321",
        "type": "mobile"
      },
      "email": "maria@example.com"
    }]
  }'
```

#### `GET /profile/stats`
Obtener estadísticas y completitud del perfil
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `GET /profile/completion-guide`
Obtener guía de completado del perfil
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/completion-guide" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### ✅ **VERIFICACIONES**

#### `POST /profile/verify/email`
Verificar email del usuario
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/profile/verify/email" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `POST /profile/verify/phone`
Verificar teléfono del usuario
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/profile/verify/phone" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `POST /profile/verify/identity`
Verificar identidad del usuario
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/profile/verify/identity" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 🏠 **GESTIÓN DE DIRECCIONES**

#### `GET /profile/addresses`
Obtener todas las direcciones del usuario
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/addresses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `GET /profile/addresses?type=home`
Filtrar direcciones por tipo
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/addresses?type=shipping" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `POST /profile/addresses`
Crear nueva dirección
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/profile/addresses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "home",
    "alias": "Casa Principal",
    "street": "Av. Corrientes 1234",
    "apartment": "Piso 5, Depto A",
    "neighborhood": "San Nicolás",
    "city": "Buenos Aires",
    "state": "CABA",
    "postalCode": "1043",
    "country": "Argentina",
    "references": "Portón verde, al lado de la farmacia",
    "receiverName": "Juan Pérez",
    "receiverPhone": "+541123456789",
    "isDefault": true,
    "coordinates": {
      "lat": -34.6037,
      "lng": -58.3816
    }
  }'
```

#### `PUT /profile/addresses/:addressId`
Actualizar dirección existente
```bash
curl -X PUT "https://9dbdcf7272a6.ngrok-free.app/profile/addresses/ADDRESS_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "Casa Actualizada",
    "references": "Nueva referencia"
  }'
```

#### `DELETE /profile/addresses/:addressId`
Eliminar dirección
```bash
curl -X DELETE "https://9dbdcf7272a6.ngrok-free.app/profile/addresses/ADDRESS_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `POST /profile/addresses/:addressId/set-default`
Establecer dirección como predeterminada
```bash
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/profile/addresses/ADDRESS_ID/set-default" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 🚚 **INTEGRACIÓN DRENVÍO**

#### `GET /profile/shipping-info`
Obtener información completa para envíos
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/shipping-info" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### `GET /profile/addresses/:addressId/drenvio-validation`
Validar dirección con DrEnvío
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/addresses/ADDRESS_ID/drenvio-validation" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📋 Tipos de Datos

### 🆔 **Tipos de Documento**
- `dni` - Documento Nacional de Identidad
- `passport` - Pasaporte
- `cedula` - Cédula de Identidad
- `rut` - RUT (Chile/Uruguay)
- `other` - Otro tipo

### 📱 **Tipos de Teléfono**
- `mobile` - Móvil/Celular
- `home` - Casa
- `work` - Trabajo
- `other` - Otro

### 🏠 **Tipos de Dirección**
- `home` - Casa
- `work` - Trabajo
- `billing` - Facturación
- `shipping` - Envío
- `other` - Otro

### 👤 **Género**
- `male` - Masculino
- `female` - Femenino
- `other` - Otro
- `prefer_not_to_say` - Prefiero no decir

---

## 🔒 **Validaciones y Reglas de Negocio**

### ✅ **Validaciones Automáticas**
- **Documentos únicos**: No se permiten documentos duplicados entre usuarios
- **Teléfonos únicos**: No se permiten números duplicados entre usuarios
- **Dirección predeterminada**: Siempre debe haber una dirección por defecto
- **Longitudes máximas**: Todos los campos tienen límites de caracteres
- **Formatos de email**: Validación de formato de email

### 🏠 **Reglas de Direcciones**
- **Mínimo una dirección**: No se puede eliminar la única dirección
- **Una dirección por defecto**: Solo una puede ser predeterminada
- **Soft delete**: Las direcciones se desactivan, no se eliminan
- **Validación DrEnvío**: Integración opcional con servicio de envíos

### 📊 **Completitud del Perfil**
El sistema calcula automáticamente el porcentaje de completitud basado en:
1. Información personal básica (30%)
2. Información de contacto (20%)
3. Documentos de identidad (15%)
4. Direcciones de envío (20%)
5. Contactos de emergencia (10%)
6. Verificaciones (5%)

---

## 🚀 **Ejemplos de Uso Completo**

### 1. **Flujo de Registro Completo**
```bash
# 1. Obtener perfil (se crea automáticamente)
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Completar información personal
curl -X PUT "https://9dbdcf7272a6.ngrok-free.app/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan Carlos",
    "lastName": "Pérez García",
    "dateOfBirth": "1985-03-20",
    "gender": "male"
  }'

# 3. Agregar teléfono
curl -X PUT "https://9dbdcf7272a6.ngrok-free.app/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": [{
      "countryCode": "+54",
      "number": "1123456789",
      "type": "mobile",
      "isPrimary": true
    }]
  }'

# 4. Agregar documento
curl -X PUT "https://9dbdcf7272a6.ngrok-free.app/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [{
      "type": "dni",
      "number": "12345678",
      "issuingCountry": "Argentina"
    }]
  }'

# 5. Crear dirección de envío
curl -X POST "https://9dbdcf7272a6.ngrok-free.app/profile/addresses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "home",
    "alias": "Casa",
    "street": "Av. Santa Fe 1234",
    "neighborhood": "Recoleta",
    "city": "Buenos Aires",
    "state": "CABA",
    "postalCode": "1010",
    "country": "Argentina"
  }'
```

### 2. **Verificar Completitud**
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/completion-guide" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. **Preparar para DrEnvío**
```bash
curl -X GET "https://9dbdcf7272a6.ngrok-free.app/profile/shipping-info" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 **Características Destacadas**

### 🔐 **Seguridad**
- ✅ Validación de documentos únicos
- ✅ Verificación de email y teléfono
- ✅ Soft delete para direcciones
- ✅ Validaciones exhaustivas de entrada

### 🚚 **Integración DrEnvío**
- ✅ Campos específicos para envíos
- ✅ Validación de zonas de entrega
- ✅ Coordenadas GPS
- ✅ Información completa del receptor

### 📊 **UX Mejorada**
- ✅ Guía de completado paso a paso
- ✅ Estadísticas del perfil
- ✅ Múltiples direcciones organizadas
- ✅ Contactos de emergencia

### 🔧 **Flexibilidad**
- ✅ Múltiples tipos de documento
- ✅ Múltiples números de teléfono
- ✅ Direcciones categorizadas
- ✅ Preferencias personalizables

El sistema está listo para una implementación profesional de e-commerce con todas las funcionalidades necesarias para DrEnvío y más.
