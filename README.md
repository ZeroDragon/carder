# Apple Wallet Pass Generator

Generador de passes de Apple Wallet (.pkpass) usando Node.js y la biblioteca `passkit-generator`.

## Estado del Proyecto

✅ **Funcional y probado** - Los passes se generan correctamente y se abren en iPhone/iPad.

**Detalles:**
- Servidor corriendo en puerto 3000
- Firma PKCS#7/CMS verificada y validada por Apple
- Certificados válidos hasta mayo 2027
- Compatible con iOS y macOS

**Última actualización:** Abril 2026

---

## Setup Rápido

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Iniciar Servidor

```bash
npm start
```

El servidor correrá en `http://localhost:3000`

### 3. Generar un Pass de Prueba

```bash
node create-test-pass.js
```

Esto generará `test-membership.pkpass` listo para probar.

### 4. Probar en Dispositivo

1. AirDrop `test-membership.pkpass` a tu iPhone/iPad
2. Toca el archivo para abrirlo
3. El pass debería aparecer en Apple Wallet

---

## API

### POST /pass

Genera y descarga un archivo .pkpass directamente.

**Example Request:**

```bash
curl -X POST http://localhost:3000/pass \
  -H "Content-Type: application/json" \
  -d '{
    "type": "generic",
    "description": "Membership Card",
    "organizationName": "Xpectros",
    "logoText": "Xpectros",
    "backgroundColor": "#1a1a2e",
    "foregroundColor": "#ffffff",
    "labelColor": "#e94560",
    "primaryFields": [
      {
        "key": "name",
        "label": "Name",
        "value": "John Doe"
      }
    ],
    "barcode": {
      "format": "PKBarcodeFormatQR",
      "message": "https://example.com/user/123",
      "altText": "123"
    }
  }' \
  -o pass.pkpass
```

**Request Body Fields:**

- `type` - Tipo de pass: `generic`, `boardingPass`, `coupon`, `eventTicket`
- `description` - Descripción del pass
- `organizationName` - Nombre de la organización
- `logoText` - Texto del logo
- `backgroundColor` - Color de fondo (hex)
- `foregroundColor` - Color del texto (hex)
- `labelColor` - Color de etiquetas (hex)
- `primaryFields` - Campos principales (array de objetos)
- `secondaryFields` - Campos secundarios (array)
- `auxiliaryFields` - Campos auxiliares (array)
- `barcode` - Código de barras (objeto con `format`, `message`, `altText`)

### POST /pass/json

Genera un pass y lo devuelve como JSON base64 (útil para testing).

**Example:**

```bash
curl -X POST http://localhost:3000/pass/json \
  -H "Content-Type: application/json" \
  -d '{"type": "generic", "description": "Test"}'
```

**Response:**

```json
{
  "pass": "base64encodedpkpasscontent",
  "serialNumber": "uuid-of-the-pass"
}
```

### GET /health

Endpoint de health check.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-04-08T21:00:00.000Z"
}
```

---

## Tipos de Pass Soportados

### Generic
`type: "generic"` - Tarjetas genéricas (membresías, lealtad, etc.)

```json
{
  "type": "generic",
  "description": "Membership Card",
  "primaryFields": [
    {
      "key": "name",
      "label": "Name",
      "value": "Carlos Fernando"
    }
  ]
}
```

### Boarding Pass
`type: "boardingPass"` - Pasajes de vuelo

```json
{
  "type": "boardingPass",
  "transitType": "PKTransitTypeAir",
  "primaryFields": [
    {
      "key": "flight",
      "label": "Flight",
      "value": "AA123"
    }
  ]
}
```

### Coupon
`type: "coupon"` - Cupones y descuentos

```json
{
  "type": "coupon",
  "primaryFields": [
    {
      "key": "discount",
      "label": "Discount",
      "value": "20%"
    }
  ]
}
```

### Event Ticket
`type: "eventTicket"` - Entradas a eventos

```json
{
  "type": "eventTicket",
  "primaryFields": [
    {
      "key": "event",
      "label": "Event",
      "value": "Concert 2027"
    }
  ]
}
```

---

## Campos del Pass

### Field Structure

Cada campo debe tener:

```javascript
{
  "key": "unique-identifier",        // Requerido: identificador único
  "label": "Display Label",          // Opcional: etiqueta del campo
  "value": "Display Value",           // Requerido: valor a mostrar
  "currencyCode": "USD",             // Opcional: para valores monetarios
  "changeMessage": "Updated to %@",   // Opcional: mensaje de cambio
  "textAlignment": "PKTextAlignmentNatural", // Opcional: alineación
  "dateStyle": "PKDateStyleMedium",  // Opcional: estilo de fecha
  "timeStyle": "PKDateStyleShort",  // Opcional: estilo de hora
  "isRelative": false,                // Opcional: fecha relativa
  "ignoreTimeZone": false              // Opcional: ignorar zona horaria
}
```

### Barcode Types

Soporta múltiples formatos:

```javascript
{
  "format": "PKBarcodeFormatQR",           // QR Code
  // "format": "PKBarcodeFormatPDF417",    // PDF417
  // "format": "PKBarcodeFormatAztec",      // Aztec
  "message": "https://example.com",       // Contenido del código
  "messageEncoding": "iso-8859-1",      // Codificación
  "altText": "123456"                    // Texto alternativo
}
```

---

## Imágenes Opcionales

Imágenes para personalización del pass:

| Imagen | Dimensiones | Descripción |
|---------|-------------|-------------|
| `logo.png` | 160x50 puntos | Logo del pass |
| `icon.png` | 29x29 puntos | **Requerido para iOS** |
| `icon@2x.png` | 58x58 puntos | Icono retina |
| `strip.png` | 375x98 puntos | Para event tickets |
| `thumbnail.png` | 90x90 puntos | Vista previa |

**Para agregar imágenes:**

```javascript
{
  "type": "generic",
  "images": {
    "icon": "./path/to/icon.png",
    "logo": "./path/to/logo.png"
  },
  // ... otros campos
}
```

---

## Configuración de Certificados

### Archivos Requeridos

Place estos archivos en `certificates/originals/`:

1. **`pass.pem`** - Certificado de Pass Type ID (convertido a PEM)
2. **`privateKey.key`** - Llave privada RSA
3. **`AppleWWDRCAG4.pem`** - Certificado WWDRCA de Apple

### Rutas de Configuración

En `src/config.js`:

```javascript
export const config = {
  apple: {
    passCertificatePath: './certificates/originals/pass.pem',
    passPrivateKeyPath: './certificates/originals/privateKey.key',
    appleWWDRCAPath: './certificates/originals/AppleWWDRCAG4.pem',
    teamIdentifier: '428JSB6QUW',
    passTypeIdentifier: 'pass.com.xpectros.memberships'
  }
}
```

### Certificados Actuales

- **Team ID:** `428JSB6QUW`
- **Pass Type ID:** `pass.com.xpectros.memberships`
- **Válido hasta:** 8 de mayo de 2027

**Para renovar certificados en 2027:** Ver `CERTIFICATE_RENEWAL_2027.md`

---

## Renovación de Certificados (2027)

Cuando el certificado expire en mayo de 2027, sigue la guía completa en:

**[CERTIFICATE_RENEWAL_2027.md](./CERTIFICATE_RENEWAL_2027.md)**

La guía incluye:
- Paso a paso para generar CSR
- Instrucciones para subir a Apple Developer Portal
- Proceso de conversión a PEM
- Actualización de configuración
- Verificación y testing
- Scripts de automatización

---

## Estructura del Proyecto

```
carder/
├── src/
│   ├── index.js              # Servidor Express
│   ├── passGenerator.js      # Generador de passes (usa passkit-generator)
│   └── config.js            # Configuración
├── certificates/
│   └── originals/           # Certificados y llaves
│       ├── pass.pem          # Certificado Pass Type ID
│       ├── privateKey.key     # Llave privada
│       └── AppleWWDRCAG4.pem # Certificado WWDRCA
├── templates/
│   └── membership.pass/      # Plantilla de pass
│       ├── pass.json        # Estructura base
│       └── icon.png         # Imagen obligatoria
├── create-test-pass.js         # Script de prueba
├── CERTIFICATE_RENEWAL_2027.md # Guía de renovación
├── README.md                 # Este archivo
└── package.json
```

---

## Troubleshooting

### El pass no se abre en iPhone/iPad

**Causa 1:** Certificado inválido o expirado
**Solución:** Verifica fechas con `openssl x509 -in pass.pem -noout -dates`

**Causa 2:** Firma incorrecta
**Solución:** El sistema usa `passkit-generator` que maneja la firma automáticamente

**Causa 3:** Falta icon.png
**Solución:** Asegúrate de incluir `icon.png` en la plantilla

### El servidor no inicia

**Causa:** Certificados no encontrados
**Solución:**
```bash
# Verifica que los archivos existen
ls -la certificates/originals/pass.pem
ls -la certificates/originals/privateKey.key
ls -la certificates/originals/AppleWWDRCAG4.pem
```

### Error de validación

**Verificar estructura del pass:**
```bash
# Extraer pass
unzip -l pass.pkpass

# Verificar contenido
unzip -q pass.pkpass -d /tmp/verify
cat /tmp/verify/manifest.json
```

---

## Tecnologías

- **Node.js** v24.6.0
- **Express** v4.22.1 - Servidor web
- **passkit-generator** v3.5.7 - Generación de passes
- **OpenSSL** - Utilizado por passkit-generator para firmar
- **Archiver** v6.0.2 - Creación de archivos ZIP

---

## Referencias

- [Apple Wallet Documentation](https://developer.apple.com/wallet/)
- [PassKit Programming Guide](https://developer.apple.com/library/archive/documentation/PassKit/)
- [passkit-generator Library](https://github.com/alexandercerutti/passkit-generator)
- [Apple Certificate Authority](https://www.apple.com/certificateauthority/)

---

## License

MIT

---

**Desarrollado por:** TU NOMBRE
**Año:** 2026
**Propósito:** Generación de passes de Apple Wallet para Xpectros Memberships
