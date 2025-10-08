# 📋 Solicitud Completa de Datos para Drenvio

## 📞 **EMAIL PARA EL SOPORTE DE DRENVIO**

```
Asunto: Solicitud de credenciales API para integración - México

Estimado equipo de soporte de Drenvio,

Soy desarrollador de [NOMBRE DE TU EMPRESA] y necesito completar la configuración de la integración API con Drenvio para una tienda online de calzado.

**DATOS ACTUALES:**
- API Key: [TU_API_KEY_AQUI]
- País: México
- Tipo de negocio: E-commerce (calzado)

**DATOS QUE NECESITO:**
1. **Secret Key** (clave secreta que acompaña al API Key)
2. **Webhook Secret** (para validar webhooks)
3. **URL base de la API para México** (confirmar si es correcta)
4. **Entorno actual** (sandbox vs production)
5. **Documentación específica para México** (si existe)

**FUNCIONALIDADES QUE NECESITO:**
- Cálculo de costos de envío
- Creación de envíos
- Seguimiento de paquetes
- Webhooks para actualizaciones de estado
- Integración con e-commerce

**PREGUNTAS ESPECÍFICAS:**
- ¿Dónde encuentro el Secret Key en mi panel de administración?
- ¿Cuál es la URL base correcta para la API de México?
- ¿Cómo configuro los webhooks para recibir actualizaciones?
- ¿Hay diferencias entre sandbox y production para México?
- ¿Necesito configuración adicional para envíos nacionales?

**INFORMACIÓN DEL PROYECTO:**
- Empresa: [NOMBRE DE LA EMPRESA]
- RFC: [RFC_DE_LA_EMPRESA]
- Email de contacto: [TU_EMAIL]
- Teléfono: [TU_TELEFONO]

Por favor, proporcionen estos datos o indíquenme dónde encontrarlos en el panel de administración.

Gracias por su ayuda.

Saludos,
[TU_NOMBRE]
[TU_EMPRESA]
[TU_EMAIL]
[TU_TELEFONO]
```

---

## 📝 **FORMULARIO PARA EL CLIENTE**

```
Asunto: Información requerida para configuración de envíos con Drenvio

Estimado [NOMBRE DEL CLIENTE],

Para completar la configuración del sistema de envíos con Drenvio, necesito la siguiente información de la empresa:

### 📋 **INFORMACIÓN FISCAL (OBLIGATORIA)**
1. **RFC de la empresa:** ________________________________
   *Ejemplo: ABC123456789 o ABC123456ABC*

2. **Nombre completo de la empresa:** ________________________________
   *Ejemplo: Calzado Premium S.A. de C.V.*

3. **Dirección fiscal completa:** ________________________________
   *Ejemplo: Av. Insurgentes Sur 1234, Col. Del Valle*

4. **Ciudad:** ________________________________
   *Ejemplo: Ciudad de México*

5. **Estado:** ________________________________
   *Ejemplo: CDMX*

6. **Código postal:** ________________________________
   *Ejemplo: 03100*

### 📞 **INFORMACIÓN DE CONTACTO (OBLIGATORIA)**
7. **Teléfono de la empresa:** ________________________________
   *Ejemplo: +52 55 1234-5678*

8. **Email de contacto para envíos:** ________________________________
   *Ejemplo: envios@empresa.com*

9. **Email de facturación:** ________________________________
   *Ejemplo: facturacion@empresa.com*

### 🏢 **INFORMACIÓN ADICIONAL (OPCIONAL)**
10. **Sitio web:** ________________________________
    *Ejemplo: www.empresa.com*

11. **Horarios de atención:** ________________________________
    *Ejemplo: Lunes a Viernes 9:00 AM - 6:00 PM*

12. **Persona de contacto:** ________________________________
    *Ejemplo: Juan Pérez*

### 📦 **INFORMACIÓN DE ENVÍOS (OPCIONAL)**
13. **Dirección de origen (warehouse):** ________________________________
    *Ejemplo: Calle Principal 456, Col. Industrial*

14. **Ciudad de origen:** ________________________________
    *Ejemplo: Ciudad de México*

15. **Código postal de origen:** ________________________________
    *Ejemplo: 03100*

### ⚠️ **IMPORTANTE:**
Esta información es necesaria para:
- Configurar la integración con Drenvio
- Generar etiquetas de envío
- Procesar facturas de envío
- Configurar webhooks de seguimiento
- Cumplir con regulaciones fiscales

### 📋 **INSTRUCCIONES:**
1. Complete todos los campos marcados como "OBLIGATORIA"
2. Los campos "OPCIONAL" pueden completarse después
3. Envíe esta información por email a: [TU_EMAIL]
4. Si tiene dudas, contacte al: [TU_TELEFONO]

**Fecha límite:** [FECHA_LIMITE]

Gracias por su colaboración.

Saludos,
[TU_NOMBRE]
[TU_EMPRESA]
[TU_EMAIL]
[TU_TELEFONO]
```

---

## 🔧 **CONFIGURACIÓN FINAL PARA TU ARCHIVO .env**

Una vez que tengas todos los datos, configura tu archivo `.env` así:

```bash
# DrEnvío Shipping - México
DRENVIO_API_URL=https://api.drenvio.com.mx/v1
DRENVIO_API_KEY=[TU_API_KEY_AQUI]
DRENVIO_SECRET_KEY=[SECRET_KEY_DEL_SOPORTE]
DRENVIO_ENVIRONMENT=sandbox
COMPANY_RFC=[RFC_DEL_CLIENTE]
DRENVIO_WEBHOOK_SECRET=[WEBHOOK_SECRET_DEL_SOPORTE]

# Información de la empresa (opcional)
COMPANY_NAME=[NOMBRE_DE_LA_EMPRESA]
COMPANY_ADDRESS=[DIRECCION_DE_LA_EMPRESA]
COMPANY_PHONE=[TELEFONO_DE_LA_EMPRESA]
COMPANY_EMAIL=[EMAIL_DE_LA_EMPRESA]
```

---

## 📋 **CHECKLIST DE SEGUIMIENTO**

### ✅ **Para el Soporte de Drenvio:**
- [ ] Secret Key recibido
- [ ] Webhook Secret recibido
- [ ] URL base confirmada
- [ ] Entorno confirmado (sandbox/production)
- [ ] Documentación recibida

### ✅ **Para el Cliente:**
- [ ] RFC de la empresa
- [ ] Nombre completo de la empresa
- [ ] Dirección fiscal completa
- [ ] Teléfono de contacto
- [ ] Email de contacto
- [ ] Dirección de origen (warehouse)

### ✅ **Configuración Final:**
- [ ] Archivo .env configurado
- [ ] Credenciales probadas
- [ ] Webhooks configurados
- [ ] Pruebas de envío realizadas

---

## 🚨 **NOTAS IMPORTANTES:**

1. **NO compartas** tu API Key en emails públicos
2. **Guarda** todos los datos en un lugar seguro
3. **Prueba** primero en sandbox antes de production
4. **Verifica** que todos los datos sean correctos
5. **Documenta** cualquier configuración adicional

¿Necesitas ayuda con algún paso específico o tienes alguna pregunta sobre la configuración?
