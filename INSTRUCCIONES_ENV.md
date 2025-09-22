# 📋 Instrucciones para Configurar Variables de Entorno

## 🎯 **Paso a Paso para Configurar tu .env**

### **1. Crear el archivo .env**
```bash
# En la raíz de tu proyecto, crea el archivo .env
touch .env
```

### **2. Copiar el contenido completo**
Abre el archivo `ENV_VARIABLES_COMPLETE.md` que acabo de crear y copia todo el contenido que está dentro de los backticks (```bash hasta ```).

### **3. Pegar en tu archivo .env**
Pega todo el contenido copiado en tu archivo `.env`.

### **4. Variables CRÍTICAS que DEBES cambiar INMEDIATAMENTE:**

```bash
# Cambia estas claves secretas (genera claves seguras de 32+ caracteres)
JWT_SECRET=tu-clave-super-secreta-jwt-de-32-caracteres-minimo
SESSION_SECRET=tu-clave-secreta-de-sesion-de-32-caracteres-minimo

# Si tienes MongoDB local, déjalo así:
MONGODB_URI=mongodb://localhost:27017/nabra_xr1

# Si usas MongoDB Atlas, cambia por tu URL:
# MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/nabra_xr1
```

### **5. Variables que puedes configurar DESPUÉS (para funcionalidades específicas):**

#### **🔗 Google OAuth (para login con Google):**
```bash
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```

#### **💳 PayPal (ya configurado, pero puedes cambiar):**
```bash
PAYPAL_CLIENT_ID=ASLRgRIUQBs1Z8q7eJgWEhAUGq7rbFOjy4Mh19cBMkO3IROJ2hEKwwwMNF2whP5A56W4nBUe3-pRe85w
PAYPAL_CLIENT_SECRET=EJKFA2Q0ge6sDZNjzRpvKOZdZdGHLnsc8GjFkLGQbxY-DxJAyQYMtqOlkGxl9Xt3wUVOU5NWe_LXmkbv
```

#### **🚚 DrEnvío (para envíos):**
```bash
DRENVIO_API_KEY=tu-api-key-de-drenvio
DRENVIO_SECRET_KEY=tu-secret-key-de-drenvio
```

#### **📧 Email (para notificaciones por email):**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion
```

## 🚀 **Para Probar que Funciona:**

### **1. Instalar dependencias (si no lo has hecho):**
```bash
npm install
```

### **2. Iniciar el servidor:**
```bash
npm run start:dev
```

### **3. Verificar que funciona:**
- El servidor debe iniciar en el puerto 3001
- Debe conectarse a MongoDB sin errores
- Debe mostrar: `🚀 Servidor corriendo en puerto 3001`

## ⚠️ **IMPORTANTE:**

1. **NUNCA commites el archivo `.env`** al repositorio
2. **Verifica que `.env` esté en tu `.gitignore`**
3. **Las claves secretas deben ser únicas** para cada ambiente
4. **En producción**, usa claves mucho más seguras

## 🔧 **Si algo no funciona:**

### **Error de MongoDB:**
- Verifica que MongoDB esté corriendo: `mongod`
- O usa MongoDB Atlas (en la nube)

### **Error de puerto:**
- Cambia el puerto en `.env`: `PORT=3002`
- O mata el proceso que usa el puerto 3001

### **Error de CORS:**
- Verifica que `CORS_ORIGIN` tenga tu frontend: `http://localhost:3000`

## 📞 **¿Necesitas ayuda?**

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica que todas las variables estén bien escritas
3. Asegúrate de que no haya espacios extra en las variables
4. Reinicia el servidor después de cambiar el `.env`

## ✅ **Verificación Final:**

Tu archivo `.env` debe tener:
- ✅ Al menos 80+ líneas de configuración
- ✅ Variables para JWT_SECRET y SESSION_SECRET cambiadas
- ✅ MONGODB_URI configurado
- ✅ Todas las secciones (Google, PayPal, DrEnvío, etc.)

¡Con esto tu backend estará completamente configurado! 🎉
