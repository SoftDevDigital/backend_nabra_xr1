# 🔧 Variables de Entorno Completas - Backend Nabra XR1

Copia este contenido y créalo como archivo `.env` en la raíz de tu proyecto.

```bash
# ===== CONFIGURACIÓN GENERAL =====
NODE_ENV=development
PORT=3001
APP_BASE_URL=https://9dbdcf7272a6.ngrok-free.app

# ===== BASE DE DATOS =====
MONGODB_URI=mongodb://localhost:27017/nabra_xr1
MONGO_URI=mongodb://localhost:27017/nabra_xr1

# ===== JWT Y AUTENTICACIÓN =====
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret-key-change-this-in-production-minimum-32-characters

# ===== GOOGLE OAUTH2 =====
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=http://localhost:3000/
GOOGLE_FAILURE_REDIRECT=http://localhost:3000/login?error=auth_failed
ALLOWED_EMAIL_DOMAINS=gmail.com,outlook.com,yahoo.com,hotmail.com

# ===== PAYPAL =====
PAYPAL_CLIENT_ID=ASLRgRIUQBs1Z8q7eJgWEhAUGq7rbFOjy4Mh19cBMkO3IROJ2hEKwwwMNF2whP5A56W4nBUe3-pRe85w
PAYPAL_CLIENT_SECRET=EJKFA2Q0ge6sDZNjzRpvKOZdZdGHLnsc8GjFkLGQbxY-DxJAyQYMtqOlkGxl9Xt3wUVOU5NWe_LXmkbv
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_SECRET=your-paypal-webhook-secret

# ===== DRENVIO (ENVÍOS) =====
DRENVIO_API_URL=https://api.drenvio.com.ar/v1
DRENVIO_API_KEY=your_drenvio_api_key_here
DRENVIO_SECRET_KEY=your_drenvio_secret_key_here
DRENVIO_ENVIRONMENT=sandbox
COMPANY_CUIT=20-12345678-9
DRENVIO_WEBHOOK_SECRET=your_drenvio_webhook_secret

# ===== EMAIL (SMTP) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
EMAIL_FROM=noreply@nabraxr.com
EMAIL_FROM_NAME=Nabra XR

# ===== SMS (TWILIO) =====
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_FROM_NUMBER=+1234567890

# ===== PUSH NOTIFICATIONS (FCM) =====
FCM_SERVER_KEY=your_fcm_server_key_here
FCM_PROJECT_ID=your_firebase_project_id
FCM_PRIVATE_KEY_ID=your_private_key_id
FCM_PRIVATE_KEY=your_private_key
FCM_CLIENT_EMAIL=your_client_email
FCM_CLIENT_ID=your_client_id
FCM_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FCM_TOKEN_URI=https://oauth2.googleapis.com/token

# ===== CORS Y SEGURIDAD =====
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,Accept,Origin,X-Requested-With

# ===== RATE LIMITING =====
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# ===== LOGGING =====
LOG_LEVEL=debug
LOG_FORMAT=combined
LOG_FILE=logs/app.log

# ===== CACHE (OPCIONAL) =====
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ===== FILE UPLOAD =====
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx

# ===== WEBHOOKS =====
WEBHOOK_SECRET=your_webhook_secret_key
WEBHOOK_TIMEOUT=30000

# ===== ANALYTICS (OPCIONAL) =====
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
MIXPANEL_TOKEN=your_mixpanel_token

# ===== MONITORING (OPCIONAL) =====
SENTRY_DSN=your_sentry_dsn
NEW_RELIC_LICENSE_KEY=your_newrelic_license_key

# ===== BACKUP (OPCIONAL) =====
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_PATH=backups

# ===== DESARROLLO =====
DEBUG_MODE=true
MOCK_EXTERNAL_APIS=false
ENABLE_SWAGGER=true
ENABLE_METRICS=true

# ===== PRODUCCIÓN (DESCOMENTAR CUANDO SE DESPLIEGUE) =====
# NODE_ENV=production
# APP_BASE_URL=https://yourdomain.com
# GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
# GOOGLE_SUCCESS_REDIRECT=https://yourdomain.com/dashboard
# GOOGLE_FAILURE_REDIRECT=https://yourdomain.com/login?error=auth_failed
# PAYPAL_MODE=production
# DRENVIO_ENVIRONMENT=production
# CORS_ORIGIN=https://yourdomain.com
# LOG_LEVEL=info
# DEBUG_MODE=false
# MOCK_EXTERNAL_APIS=false
```

## 📋 **Explicación de Variables por Sección**

### **🔧 Configuración General**
- `NODE_ENV`: Ambiente de ejecución (development/production)
- `PORT`: Puerto donde corre el servidor (3001)
- `APP_BASE_URL`: URL base de tu aplicación (ngrok actual)

### **🗄️ Base de Datos**
- `MONGODB_URI` / `MONGO_URI`: URL de conexión a MongoDB

### **🔐 JWT y Autenticación**
- `JWT_SECRET`: Clave secreta para firmar tokens JWT (¡cambia en producción!)
- `JWT_EXPIRES_IN`: Tiempo de vida de tokens JWT
- `SESSION_SECRET`: Clave para sesiones (¡cambia en producción!)

### **🔗 Google OAuth2**
- `GOOGLE_CLIENT_ID`: ID de cliente de Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: Secreto de cliente de Google
- `GOOGLE_CALLBACK_URL`: URL de callback para OAuth
- `GOOGLE_SUCCESS_REDIRECT`: Redirección después del login exitoso
- `GOOGLE_FAILURE_REDIRECT`: Redirección después del login fallido
- `ALLOWED_EMAIL_DOMAINS`: Dominios de email permitidos (opcional)

### **💳 PayPal**
- `PAYPAL_CLIENT_ID`: ID de cliente de PayPal (ya configurado)
- `PAYPAL_CLIENT_SECRET`: Secreto de cliente de PayPal (ya configurado)
- `PAYPAL_MODE`: Modo sandbox/production
- `PAYPAL_WEBHOOK_SECRET`: Secreto para webhooks de PayPal

### **🚚 DrEnvío (Envíos)**
- `DRENVIO_API_URL`: URL de la API de DrEnvío
- `DRENVIO_API_KEY`: Clave de API de DrEnvío
- `DRENVIO_SECRET_KEY`: Clave secreta de DrEnvío
- `DRENVIO_ENVIRONMENT`: Ambiente sandbox/production
- `COMPANY_CUIT`: CUIT de tu empresa
- `DRENVIO_WEBHOOK_SECRET`: Secreto para webhooks de DrEnvío

### **📧 Email (SMTP)**
- `SMTP_HOST`: Servidor SMTP (Gmail, Outlook, etc.)
- `SMTP_PORT`: Puerto SMTP (587 para TLS)
- `SMTP_USER`: Usuario de email
- `SMTP_PASS`: Contraseña o contraseña de aplicación
- `SMTP_SECURE`: Usar SSL/TLS
- `EMAIL_FROM`: Email remitente
- `EMAIL_FROM_NAME`: Nombre del remitente

### **📱 SMS (Twilio)**
- `TWILIO_ACCOUNT_SID`: SID de cuenta de Twilio
- `TWILIO_AUTH_TOKEN`: Token de autenticación de Twilio
- `TWILIO_PHONE_NUMBER`: Número de teléfono de Twilio
- `TWILIO_FROM_NUMBER`: Número desde el cual enviar SMS

### **🔔 Push Notifications (Firebase)**
- `FCM_SERVER_KEY`: Clave del servidor de Firebase
- `FCM_PROJECT_ID`: ID del proyecto de Firebase
- `FCM_PRIVATE_KEY_ID`: ID de clave privada
- `FCM_PRIVATE_KEY`: Clave privada de Firebase
- `FCM_CLIENT_EMAIL`: Email del cliente de Firebase
- `FCM_CLIENT_ID`: ID del cliente de Firebase

### **🛡️ CORS y Seguridad**
- `CORS_ORIGIN`: Orígenes permitidos para CORS
- `CORS_CREDENTIALS`: Permitir credenciales en CORS
- `CORS_METHODS`: Métodos HTTP permitidos
- `CORS_ALLOWED_HEADERS`: Headers permitidos

### **⚡ Rate Limiting**
- `RATE_LIMIT_TTL`: Tiempo de vida de rate limiting (ms)
- `RATE_LIMIT_LIMIT`: Número máximo de requests por TTL
- `RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS`: Saltar requests exitosos

### **📝 Logging**
- `LOG_LEVEL`: Nivel de logging (debug, info, warn, error)
- `LOG_FORMAT`: Formato de logs
- `LOG_FILE`: Archivo donde guardar logs

### **🗄️ Cache (Redis - Opcional)**
- `REDIS_HOST`: Host de Redis
- `REDIS_PORT`: Puerto de Redis
- `REDIS_PASSWORD`: Contraseña de Redis
- `REDIS_DB`: Base de datos de Redis

### **📁 File Upload**
- `MAX_FILE_SIZE`: Tamaño máximo de archivo en bytes
- `UPLOAD_PATH`: Directorio de subidas
- `ALLOWED_FILE_TYPES`: Tipos de archivo permitidos

### **🔗 Webhooks**
- `WEBHOOK_SECRET`: Secreto para validar webhooks
- `WEBHOOK_TIMEOUT`: Timeout para webhooks (ms)

### **📊 Analytics (Opcional)**
- `GOOGLE_ANALYTICS_ID`: ID de Google Analytics
- `MIXPANEL_TOKEN`: Token de Mixpanel

### **📈 Monitoring (Opcional)**
- `SENTRY_DSN`: DSN de Sentry para error tracking
- `NEW_RELIC_LICENSE_KEY`: Clave de licencia de New Relic

### **💾 Backup (Opcional)**
- `BACKUP_SCHEDULE`: Horario de backups (cron)
- `BACKUP_RETENTION_DAYS`: Días de retención de backups
- `BACKUP_STORAGE_PATH`: Ruta de almacenamiento de backups

### **🔧 Desarrollo**
- `DEBUG_MODE`: Modo de debug activado
- `MOCK_EXTERNAL_APIS`: Simular APIs externas
- `ENABLE_SWAGGER`: Habilitar documentación Swagger
- `ENABLE_METRICS`: Habilitar métricas

## 🚀 **Instrucciones de Uso**

1. **Copia el contenido** de arriba
2. **Crea un archivo `.env`** en la raíz de tu proyecto
3. **Pega el contenido** en el archivo `.env`
4. **Reemplaza los valores** que dicen "your-..." con tus credenciales reales
5. **¡No commites** el archivo `.env` al repositorio (debe estar en `.gitignore`)

## ⚠️ **Importante**

- **Cambia las claves secretas** en producción
- **Usa claves de al menos 32 caracteres** para JWT_SECRET y SESSION_SECRET
- **Configura las credenciales reales** de Google, PayPal, DrEnvío, etc.
- **Las variables marcadas como "Opcional"** no son necesarias para funcionamiento básico
- **Para producción**, descomenta y configura las variables de la sección "PRODUCCIÓN"

## 🔑 **Credenciales que Necesitas Obtener**

1. **Google OAuth**: [Google Cloud Console](https://console.cloud.google.com/)
2. **PayPal**: [PayPal Developer](https://developer.paypal.com/)
3. **DrEnvío**: Contacta con DrEnvío para obtener API keys
4. **Email SMTP**: Configura tu proveedor de email
5. **Twilio**: [Twilio Console](https://console.twilio.com/)
6. **Firebase**: [Firebase Console](https://console.firebase.google.com/)

¡Con estas variables tu backend estará completamente configurado! 🎉
