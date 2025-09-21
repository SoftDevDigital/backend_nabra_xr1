# Configuración de PayPal para Nabra XR

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret

# Application
BASE_URL=http://localhost:3000
```

## Configuración de PayPal

### 1. Crear una cuenta de desarrollador de PayPal

1. Ve a [PayPal Developer](https://developer.paypal.com/)
2. Inicia sesión con tu cuenta de PayPal
3. Crea una nueva aplicación

### 2. Obtener credenciales

1. En el dashboard de PayPal Developer, selecciona tu aplicación
2. Copia el **Client ID** y **Client Secret**
3. Configura las URLs de redirección:
   - Return URL: `http://localhost:3000/payments/success`
   - Cancel URL: `http://localhost:3000/payments/cancel`

### 3. Configurar variables de entorno

```bash
PAYPAL_CLIENT_ID=tu_client_id_aqui
PAYPAL_CLIENT_SECRET=tu_client_secret_aqui
PAYPAL_ENVIRONMENT=sandbox  # Cambiar a 'production' para producción
```

## Endpoints Disponibles

### Carrito de Compras

- `GET /cart` - Obtener carrito del usuario
- `POST /cart/add` - Agregar producto al carrito
- `PUT /cart/update/:itemId` - Actualizar cantidad de producto
- `DELETE /cart/remove/:itemId` - Eliminar producto del carrito
- `GET /cart/total` - Obtener total del carrito
- `POST /cart/checkout` - Iniciar proceso de pago desde el carrito

### Pagos

- `POST /payments` - Crear pago directo
- `POST /payments/from-cart` - Crear pago desde carrito
- `POST /payments/:paymentId/capture` - Capturar pago
- `GET /payments/:paymentId` - Obtener detalles del pago
- `GET /payments` - Obtener historial de pagos del usuario
- `DELETE /payments/:paymentId` - Cancelar pago

### Redirección

- `GET /payments/success` - Página de éxito del pago
- `GET /payments/cancel` - Página de cancelación del pago

## Flujo de Pago

1. Usuario agrega productos al carrito
2. Usuario hace checkout con `POST /cart/checkout`
3. Sistema crea pago en PayPal y retorna URL de aprobación
4. Usuario es redirigido a PayPal para completar el pago
5. PayPal redirige de vuelta a `/payments/success` o `/payments/cancel`
6. Sistema captura el pago automáticamente

## Testing

Para probar en modo sandbox:

1. Usa las credenciales de sandbox de PayPal
2. Usa tarjetas de prueba de PayPal
3. Verifica que los pagos se capturen correctamente

## Producción

Para usar en producción:

1. Cambia `PAYPAL_ENVIRONMENT` a `production`
2. Usa las credenciales de producción de PayPal
3. Configura las URLs de redirección correctas
4. Configura webhooks para notificaciones automáticas



