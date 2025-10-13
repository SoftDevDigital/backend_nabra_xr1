import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  
  // Middleware para parsear cookies (necesario para autenticación con cookies seguras)
  app.use(cookieParser());
  
  // Configuración global de validación
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Servir archivos estáticos (imágenes)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Configuración de CORS simplificada
  app.enableCors({
    origin: ['http://localhost:3000', 'https://nabra.mx'],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nabra API')
    .setDescription(`Documentación de la API de Nabra para e-commerce.

**📚 Scroll hasta el final de esta página para ver los FLUJOS COMPLETOS DE TODAS LAS RUTAS**

---

# 📋 FLUJOS COMPLETOS DE LAS RUTAS

## 🔐 FLUJO 1: Autenticación de Usuario

**1.1 Registro de nuevo usuario**
- \`POST /auth/register\` → Crear cuenta nueva (pública)
- \`POST /auth/login\` → Iniciar sesión y obtener token JWT
- Guardar el token para usarlo en los siguientes requests

**1.2 Verificar sesión**
- \`GET /auth/check\` → Verificar si el token es válido

**1.3 Cerrar sesión**
- \`POST /auth/logout\` → Cerrar sesión

---

## 🛍️ FLUJO 2: Explorar Productos y Catálogo

**2.1 Ver catálogo general**
- \`GET /products\` → Listar todos los productos (pública)
- \`GET /products?page=1&limit=20\` → Con paginación
- \`GET /products?category=zapatos\` → Filtrar por categoría

**2.2 Ver producto específico**
- \`GET /products/:id\` → Ver detalle de un producto (pública)
- \`GET /products/:id/promotions\` → Ver producto con promociones aplicadas

**2.3 Buscar productos**
- \`GET /products/search?q=zapatos\` → Buscar por texto (pública)

**2.4 Ver productos especiales**
- \`GET /products/featured\` → Ver productos destacados (pública)
- \`GET /products/preorders\` → Ver productos en preventa (pública)

**2.5 Ver categorías**
- \`GET /products/categories\` → Listar todas las categorías (pública)
- \`GET /products/categories/:category/stats\` → Estadísticas de categoría (pública)

---

## 🛒 FLUJO 3: Gestión del Carrito

**3.1 Ver mi carrito**
- \`GET /cart\` → Ver carrito con promociones aplicadas automáticamente
- \`GET /cart/summary\` → Resumen con totales
- \`GET /cart/summary-with-discounts?couponCode=ABC\` → Con cupón opcional

**3.2 Agregar producto**
- \`POST /cart/add\` → Agregar producto al carrito
  - Body: \`{ "productId": "...", "quantity": 1, "size": "M" }\`

**3.3 Actualizar carrito**
- \`PUT /cart/update/:itemId\` → Actualizar cantidad o talla
  - Body: \`{ "quantity": 2 }\`
- \`DELETE /cart/remove/:itemId\` → Eliminar un item
- \`DELETE /cart/clear\` → Vaciar todo el carrito

**3.4 Validar carrito**
- \`GET /cart/validate\` → Validar stock y disponibilidad antes de checkout

**3.5 Ver carrito con promociones**
- \`GET /cart/with-promotions\` → Carrito con promociones en tiempo real
- \`GET /cart/with-promotions?couponCode=DESC10\` → Aplicar cupón

---

## 🎫 FLUJO 4: Promociones y Cupones

**4.1 Ver promociones disponibles**
- \`GET /promotions/active\` → Promociones activas (pública)
- \`GET /promotions/coupons/public\` → Cupones públicos (pública)
- \`GET /promotions/my-coupons\` → Mis cupones personales

**4.2 Validar y aplicar cupón**
- \`POST /promotions/validate-coupon\` → Validar cupón antes de usarlo (pública)
  - Body: \`{ "couponCode": "BIENVENIDA10" }\`
- \`POST /cart/apply-coupon\` → Aplicar cupón al carrito
  - Body: \`{ "couponCode": "BIENVENIDA10" }\`

**4.3 Ver promociones por producto/categoría**
- \`GET /promotions/product/:productId\` → Promociones de un producto (pública)
- \`GET /promotions/category/:category\` → Promociones de categoría (pública)

---

## 📦 FLUJO 5: Calcular Envío (NO SE USA)

**5.1 Capturar dirección y calcular**
- \`POST /shipping/capture-and-calculate\` → Capturar datos de envío y calcular total
  - Body: \`{ "address": {...}, "contact": {...} }\`

**5.2 Calcular desde carrito**
- \`POST /shipping/calculate/cart\` → Calcular envío desde items del carrito
- \`POST /shipping/calculate/cart?addressId=123\` → Con dirección guardada

**5.3 Consultar zonas**
- \`GET /shipping/zones/:postalCode\` → Info de zona por código postal

**5.4 Ver servicios de envío**
- \`GET /shipping/services\` → Servicios disponibles
- \`GET /shipping/coverage\` → Información de cobertura

---

## 💳 FLUJO 6: Pago con MercadoPago (COMPLETO)

**6.1 Crear checkout en MercadoPago**
- \`POST /payments/mercadopago/checkout\` → Crear preferencia de pago
  - Body: \`{ "returnUrl": "...", "cancelUrl": "...", "simpleShipping": {...} }\`
  - Respuesta: \`{ "init_point": "https://mercadopago.com/..." }\`

**6.2 Usuario paga en MercadoPago**
- Redirigir al usuario a la URL \`init_point\`
- Usuario completa el pago en MercadoPago

**6.3 Callback automático (backend)**
- \`GET /payments/mercadopago/success\` → MercadoPago redirige aquí (automático)
- Sistema crea la orden automáticamente
- Sistema limpia el carrito
- Sistema envía email de confirmación
- Redirige al frontend con \`payment_id\` y \`status\`

**6.4 Confirmar pago (opcional)**
- \`GET /payments?limit=10\` → Ver mis pagos

---

## 📋 FLUJO 7: Ver y Gestionar Órdenes

**7.1 Ver mis órdenes**
- \`GET /orders/my-orders\` → Listar todas mis órdenes
- \`GET /orders/my-orders?limit=10&offset=0\` → Con paginación
- \`GET /orders/my-orders/:id\` → Ver detalle de una orden específica

**7.2 Resumen de órdenes**
- \`GET /orders/my-orders/summary\` → KPIs y totales de mis órdenes

---

## 🚚 FLUJO 8: Tracking de Envío

**8.1 Consultar tracking**
- \`GET /orders/my-orders/:id\` → Obtener orden (incluye tracking number)
- \`GET /shipping/track/order/:orderId\` → Tracking por ID de orden
- \`GET /shipping/track/:trackingNumber\` → Tracking público por número

**8.2 Ver historial de envíos**
- \`GET /shipping/my-shipments\` → Todos mis envíos
- \`GET /shipping/my-shipments?limit=10&offset=0\` → Con paginación

---

## ⭐ FLUJO 9: Reseñas de Productos

**9.1 Ver reseñas de un producto**
- \`GET /reviews/product/:productId\` → Ver reseñas de un producto (pública)
- \`GET /reviews/product/:productId/stats\` → Estadísticas de reseñas (pública)

**9.2 Crear mi reseña**
- \`GET /reviews/can-review/:productId\` → Verificar si puedo reseñar
- \`POST /reviews\` → Crear reseña
  - Body: \`{ "productId": "...", "rating": 5, "title": "...", "comment": "..." }\`

**9.3 Gestionar mis reseñas**
- \`GET /reviews/my-reviews\` → Ver todas mis reseñas
- \`PUT /reviews/:reviewId\` → Editar mi reseña
- \`DELETE /reviews/:reviewId\` → Eliminar mi reseña

**9.4 Interactuar con reseñas**
- \`POST /reviews/:reviewId/helpful\` → Marcar reseña como útil
- \`POST /reviews/:reviewId/flag\` → Reportar reseña inapropiada

---

## 👤 FLUJO 10: Perfil y Direcciones

**10.1 Ver y actualizar perfil**
- \`GET /profile\` → Ver mi perfil completo
- \`PUT /profile\` → Actualizar datos personales
  - Body: \`{ "firstName": "...", "lastName": "...", "phone": "..." }\`
- \`GET /profile/stats\` → Estadísticas de mi perfil

**10.2 Gestión de direcciones**
- \`GET /profile/addresses\` → Listar todas mis direcciones
- \`POST /profile/addresses\` → Agregar nueva dirección
  - Body: \`{ "street": "...", "city": "...", "postalCode": "...", "country": "..." }\`
- \`GET /profile/addresses/:addressId\` → Ver una dirección específica
- \`PUT /profile/addresses/:addressId\` → Actualizar dirección
- \`DELETE /profile/addresses/:addressId\` → Eliminar dirección
- \`POST /profile/addresses/:addressId/set-default\` → Marcar como predeterminada

**10.3 Info para envíos**
- \`GET /profile/shipping-info\` → Datos de perfil para envíos
- \`GET /profile/addresses/:addressId/drenvio-validation\` → Validar dirección

**10.4 Verificaciones**
- \`POST /profile/verify/email\` → Verificar email
- \`POST /profile/verify/phone\` → Verificar teléfono

---

## 👥 FLUJO 11: Usuarios (Admin)

**11.1 Gestión de usuarios**
- \`GET /users\` → Listar todos los usuarios (admin)
- \`GET /users/:id\` → Ver usuario por ID (admin)
- \`PUT /users/:id/role\` → Actualizar rol de usuario (admin)
- \`DELETE /users/:id\` → Eliminar usuario (admin)

---

## 🔧 FLUJO 12: Admin - Dashboard y Estadísticas

**12.1 Dashboard principal**
- \`GET /admin/dashboard\` → Métricas generales (usuarios, órdenes, ingresos, etc.)
- \`GET /admin/stats/quick\` → KPIs rápidos

**12.2 Gestión de productos (admin)**
- \`GET /admin/products\` → Listar productos con filtros
- \`GET /admin/products/low-stock\` → Productos con stock bajo
- \`PUT /admin/products/:productId/stock\` → Actualizar stock
- \`PUT /admin/products/:productId/toggle-featured\` → Alternar destacado

**12.3 Gestión de órdenes (admin)**
- \`GET /admin/orders\` → Listar órdenes con filtros
- \`PUT /admin/orders/:orderId/status\` → Actualizar estado de orden

**12.4 Gestión de reseñas (admin)**
- \`GET /admin/reviews/pending\` → Reseñas pendientes de moderación
- \`PUT /admin/reviews/:reviewId/moderate\` → Moderar reseña

**12.5 Gestión de promociones (admin)**
- \`GET /admin/promotions\` → Listar promociones
- \`POST /admin/promotions/create\` → Crear promoción
- \`PUT /admin/promotions/:promotionId\` → Actualizar promoción
- \`DELETE /admin/promotions/:promotionId\` → Eliminar promoción
- \`GET /admin/coupons\` → Listar cupones
- \`POST /admin/coupons/create\` → Crear cupón

---

## 🔔 FLUJO 13: Notificaciones

**13.1 Ver mis notificaciones**
- \`GET /notifications\` → Listar mis notificaciones
- \`GET /notifications/stats\` → Estadísticas de notificaciones

**13.2 Gestionar notificaciones**
- \`PUT /notifications/:id/read\` → Marcar como leída
- \`PUT /notifications/read-all\` → Marcar todas como leídas

**13.3 Preferencias**
- \`GET /notifications/preferences\` → Ver mis preferencias
- \`PUT /notifications/preferences\` → Actualizar preferencias

---

## 🔐 AUTENTICACIÓN

**Uso del token JWT:**
1. Hacer login en \`POST /auth/login\`
2. Copiar el \`accessToken\` de la respuesta
3. Click en botón **"Authorize" 🔒** arriba en Swagger
4. Ingresar: \`Bearer TU_TOKEN_AQUI\`
5. Click en "Authorize"

**Endpoints públicos (no requieren token):**
- \`POST /auth/register\`
- \`POST /auth/login\`
- \`GET /products\`
- \`GET /products/:id\`
- \`GET /products/search\`
- \`GET /products/featured\`
- \`GET /products/preorders\`
- \`GET /products/categories\`
- \`GET /promotions/active\`
- \`GET /promotions/coupons/public\`
- \`GET /reviews/product/:productId\`
- \`GET /shipping/track/:trackingNumber\`
- \`POST /promotions/validate-coupon\`
    `)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        description: 'Introduce el token JWT con el prefijo Bearer',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Nabra API Docs',
  });

  // Puerto desde variables de entorno
  const port = configService.get('PORT') || 3001;
  await app.listen(port);
}
bootstrap();
