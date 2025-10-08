# 🚀 Guía de Despliegue - Nabra XR Backend

## 📋 Información General

- **Dominio**: `https://api.nabra.mx:3001`
- **Puerto**: 3001
- **Frontend**: `https://nabra.mx`
- **Método de pago**: **MercadoPago únicamente** 🇲🇽
- **Moneda**: MXN (Pesos Mexicanos)

---

## 📦 Pre-requisitos

- Node.js 18+ 
- MongoDB (local o Atlas)
- Cuenta de MercadoPago con credenciales de producción
- Certificado SSL configurado para api.nabra.mx

---

## ⚙️ Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en el directorio raíz basado en `.env.production.example`:

```bash
# URLs del Sistema
BACKEND_URL=https://api.nabra.mx:3001
FRONTEND_URL=https://nabra.mx

# MongoDB
MONGODB_URI=tu_conexion_mongodb

# JWT
JWT_SECRET=cambiar_por_secret_seguro
JWT_EXPIRES_IN=7d

# Google OAuth (si se usa)
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=https://api.nabra.mx:3001/auth/google/callback

# MercadoPago (PRODUCCIÓN)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-tu_token_de_produccion
MERCADOPAGO_CURRENCY=MXN
MP_BINARY_MODE=true

# Server
NODE_ENV=production
PORT=3001
```

### 2. Configurar MercadoPago

#### a) Obtener Credenciales de Producción

1. Ir a https://www.mercadopago.com.mx/developers
2. Seleccionar tu aplicación
3. Ir a "Credenciales"
4. Copiar el **Access Token de Producción**

#### b) Configurar Webhooks en MercadoPago

1. En el panel de desarrolladores de MercadoPago
2. Ir a "Webhooks" o "Notificaciones IPN"
3. Agregar URL: `https://api.nabra.mx:3001/payments/webhook/mercadopago`
4. Seleccionar eventos:
   - ✅ payment
   - ✅ merchant_order
5. Guardar y activar

#### c) Configurar URLs de Callback

Las siguientes URLs deben ser accesibles públicamente:
- **Success**: `https://api.nabra.mx:3001/payments/mercadopago/success`
- **Failure**: `https://api.nabra.mx:3001/payments/mercadopago/failure`
- **Pending**: `https://api.nabra.mx:3001/payments/mercadopago/pending`

Estas URLs redirigen automáticamente al frontend.

---

## 🔨 Instalación

```bash
# Instalar dependencias
npm install

# Compilar el proyecto
npm run build

# Iniciar en modo producción
npm run start:prod
```

---

## 🔄 PM2 (Recomendado para Producción)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar con PM2
pm2 start npm --name "nabra-backend" -- run start:prod

# Guardar configuración de PM2
pm2 save

# Configurar inicio automático
pm2 startup

# Ver logs
pm2 logs nabra-backend

# Reiniciar
pm2 restart nabra-backend

# Detener
pm2 stop nabra-backend
```

---

## 🔐 Nginx Configuration (SSL)

Ejemplo de configuración de Nginx para SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name api.nabra.mx;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name api.nabra.mx;
    return 301 https://$server_name$request_uri;
}
```

---

## 🧪 Verificación de Despliegue

### 1. Health Check
```bash
curl https://api.nabra.mx:3001
```

Debería responder con información del servicio.

### 2. Probar Endpoints Principales

```bash
# Ver productos
curl https://api.nabra.mx:3001/products

# Health check de MercadoPago (webhook debe estar accesible)
curl https://api.nabra.mx:3001/payments/webhook/mercadopago
```

### 3. Probar Flujo de Pago Completo

1. Agregar productos al carrito
2. Hacer checkout con shipping address
3. Completar pago en MercadoPago
4. Verificar que se cree la orden automáticamente

---

## 📊 Endpoints Principales (Solo MercadoPago)

### Carrito
- `POST /cart/add` - Agregar al carrito
- `GET /cart` - Ver carrito
- `POST /cart/checkout` - **Iniciar pago con MercadoPago**

### Pagos MercadoPago
- `POST /payments/mercadopago/from-cart` - Pagar carrito completo
- `POST /payments/mercadopago/partial-checkout` - Pagar items seleccionados
- `POST /payments/webhook/mercadopago` - Webhook de notificaciones
- `GET /payments/mercadopago/success` - Callback de éxito
- `GET /payments/mercadopago/failure` - Callback de fallo
- `GET /payments/mercadopago/pending` - Callback pendiente

### Órdenes
- `GET /orders` - Ver órdenes del usuario
- `GET /orders/:id` - Ver detalle de orden

---

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Verificar puerto 3001 disponible
lsof -i :3001
# o en Windows
netstat -ano | findstr :3001

# Verificar logs
pm2 logs nabra-backend
```

### MercadoPago no funciona
1. Verificar que `MERCADOPAGO_ACCESS_TOKEN` sea de **producción** (no test)
2. Verificar que el webhook esté configurado correctamente
3. Revisar logs del webhook en MercadoPago Developer Dashboard
4. Verificar que las URLs de callback sean accesibles públicamente

### CORS Errors
El backend está configurado para aceptar requests de:
- `https://nabra.mx` (producción)
- `http://localhost:3000` (desarrollo)

Si necesitas agregar más origins, editar `src/main.ts`.

### MongoDB Connection Issues
```bash
# Verificar conexión
mongo "tu_mongodb_uri"

# Verificar en logs
pm2 logs nabra-backend | grep -i mongo
```

---

## 📝 Logs y Monitoreo

### Ver logs en tiempo real
```bash
pm2 logs nabra-backend --lines 100
```

### Logs de pagos
Los pagos de MercadoPago se logean automáticamente:
```bash
pm2 logs nabra-backend | grep -i "mercadopago"
```

### Logs de webhooks
```bash
pm2 logs nabra-backend | grep -i "webhook"
```

---

## 🔄 Actualización de Código

```bash
# 1. Pull del repositorio
git pull origin main

# 2. Instalar dependencias nuevas (si hay)
npm install

# 3. Compilar
npm run build

# 4. Reiniciar con PM2
pm2 restart nabra-backend
```

---

## 🛡️ Seguridad

### Checklist de Seguridad

- ✅ JWT_SECRET único y seguro
- ✅ HTTPS habilitado (certificado SSL válido)
- ✅ Variables de entorno protegidas (no en git)
- ✅ CORS configurado correctamente
- ✅ Credenciales de MercadoPago de producción
- ✅ MongoDB con autenticación habilitada
- ✅ Rate limiting configurado (si aplica)
- ✅ Firewall configurado para puerto 3001
- ✅ Backups automáticos de MongoDB

---

## 📞 Soporte

- **Documentación API**: Ver `API_REFERENCE.md`
- **Integración MercadoPago**: Ver `MERCADOPAGO_INTEGRATION.md`
- **MercadoPago Docs**: https://www.mercadopago.com.mx/developers/es/docs

---

## 🎯 Resumen Rápido

```bash
# Setup inicial
cp .env.production.example .env
# Editar .env con tus credenciales
npm install
npm run build

# Iniciar con PM2
pm2 start npm --name "nabra-backend" -- run start:prod
pm2 save

# Verificar
curl https://api.nabra.mx:3001
```

✅ **Backend listo en**: `https://api.nabra.mx:3001`  
✅ **Solo MercadoPago**: Pagos en MXN 🇲🇽  
✅ **Shipping incluido**: En todos los checkouts


