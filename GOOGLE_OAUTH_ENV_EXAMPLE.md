# 🔐 Variables de Entorno para Google OAuth

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```bash
# ===== CONFIGURACIÓN GENERAL =====
NODE_ENV=development
PORT=3001

# ===== BASE DE DATOS =====
MONGODB_URI=mongodb://localhost:27017/nabra_xr1

# ===== JWT =====
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# ===== SESIONES =====
SESSION_SECRET=your-session-secret-key-here

# ===== GOOGLE OAUTH2 =====
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=http://localhost:3000/dashboard
GOOGLE_FAILURE_REDIRECT=http://localhost:3000/login?error=auth_failed

# ===== PAYPAL =====
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox

# ===== DRENVIO =====
DRENVIO_API_KEY=your-drenvio-api-key
DRENVIO_SECRET_KEY=your-drenvio-secret-key
DRENVIO_ENVIRONMENT=sandbox
DRENVIO_COMPANY_CUIT=your-company-cuit

# ===== EMAIL (OPCIONAL) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ===== SMS (OPCIONAL) =====
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# ===== PUSH NOTIFICATIONS (OPCIONAL) =====
FCM_SERVER_KEY=your-fcm-server-key

# ===== CORS =====
CORS_ORIGIN=http://localhost:3000

# ===== DOMINIOS DE EMAIL PERMITIDOS (OPCIONAL) =====
# ALLOWED_EMAIL_DOMAINS=gmail.com,outlook.com,yahoo.com

# ===== LOGGING =====
LOG_LEVEL=debug
```

## 🔑 Cómo Obtener las Credenciales de Google

### 1. **Crear Proyecto en Google Cloud Console**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google+ API** y **Google Identity API**

### 2. **Configurar OAuth Consent Screen**
1. Ve a "APIs y servicios" > "Pantalla de consentimiento OAuth"
2. Selecciona "Externo" (para usuarios fuera de tu organización)
3. Completa la información requerida:
   - Nombre de la aplicación
   - Email de soporte
   - Dominios autorizados
   - URLs de política de privacidad y términos de servicio

### 3. **Crear Credenciales OAuth 2.0**
1. Ve a "APIs y servicios" > "Credenciales"
2. Haz clic en "Crear credenciales" > "ID de cliente de OAuth 2.0"
3. Selecciona "Aplicación web"
4. Configura las URLs de redirección autorizadas:
   - **Desarrollo**: `http://localhost:3001/auth/google/callback`
   - **Producción**: `https://yourdomain.com/auth/google/callback`
5. Guarda el **Client ID** y **Client Secret**

### 4. **Configurar URLs de Redirección**
- **Callback URL**: `http://localhost:3001/auth/google/callback`
- **Success Redirect**: `http://localhost:3000/dashboard`
- **Failure Redirect**: `http://localhost:3000/login?error=auth_failed`

## 🔒 Configuración de Seguridad

### Variables Importantes:
- **JWT_SECRET**: Clave secreta para firmar tokens JWT (mínimo 32 caracteres)
- **SESSION_SECRET**: Clave secreta para sesiones (mínimo 32 caracteres)
- **GOOGLE_CLIENT_SECRET**: Mantén esto seguro, nunca lo expongas en el frontend

### Configuración de Producción:
```bash
NODE_ENV=production
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=https://yourdomain.com/dashboard
GOOGLE_FAILURE_REDIRECT=https://yourdomain.com/login?error=auth_failed
```

## 🚀 Pruebas

Una vez configurado, puedes probar la integración:

1. **Iniciar el servidor**: `npm run start:dev`
2. **Visitar**: `http://localhost:3001/auth/google`
3. **Obtener URL de auth**: `GET http://localhost:3001/auth/google/auth-url`
4. **Callback**: Se maneja automáticamente en `/auth/google/callback`

## 📝 Notas Importantes

- **Nunca** commites el archivo `.env` al repositorio
- Usa diferentes credenciales para desarrollo y producción
- Configura correctamente las URLs de redirección en Google Console
- Mantén las claves secretas seguras y rota periódicamente
- Considera usar un servicio de gestión de secretos en producción
