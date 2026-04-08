# Guía de Renovación de Certificados para Apple Wallet (2027)

Esta guía te ayudará a renovar los certificados de Apple Wallet cuando expiren en mayo de 2027.

## Fecha de Expiración

**Certificado actual:** `pass.com.xpectros.memberships`
- Fecha de inicio: 8 de abril de 2026
- **Fecha de expiración: 8 de mayo de 2027**

**Nota importante:** Los certificados de Pass Type ID de Apple expiran después de 398 días (aproximadamente 13 meses).

---

## Paso 1: Acceder a Apple Developer Portal

1. Ve a [developer.apple.com](https://developer.apple.com)
2. Inicia sesión con tu cuenta de Apple Developer
3. Navega a: **Certificates, Identifiers & Profiles**
4. Selecciona **Identifiers** en el menú lateral
5. Busca "Pass Type IDs" o crea uno nuevo

---

## Paso 2: Crear Nuevo Pass Type ID

### Opción A: Crear nuevo Pass Type ID (Recomendado)

1. Haz clic en el botón **+** para crear un nuevo identificador
2. Selecciona **Pass Type IDs**
3. Llena el formulario:
   - **Description:** Xpectros Memberships
   - **Bundle ID:** `com.xpectros.memberships` (mantén este ID)
   - **Pass Type ID:** `pass.com.xpectros.memberships`
4. Haz clic en **Continue**
5. Haz clic en **Register**

### Opción B: Usar el Pass Type ID existente

Si prefieres mantener el mismo Pass Type ID, solo necesitarás renovar el certificado asociado.

---

## Paso 3: Generar CSR (Certificate Signing Request)

### Método 1: Usando OpenSSL (Método actual)

```bash
# Navega al directorio de certificados
cd /Users/carlos/Documents/personal/carder/certificates/originals

# Genera nuevo CSR y llave privada
openssl req -nodes -newkey rsa:2048 -keyout privateKey-2027.key -out CertificateSigningRequest-2027.csr \
  -subj "/C=MX/ST=CDMX/L=Ciudad de México/O=TU NOMBRE/CN=Pass Type ID: pass.com.xpectros.memberships"
```

### Método 2: Usando Keychain Access (macOS)

1. Abre **Keychain Access** en macOS
2. Selecciona **Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority**
3. Llena la información:
   - **User Email Address:** tu correo electrónico
   - **Common Name:** `Pass Type ID: pass.com.xpectros.memberships`
   - **Certificate Authority:** CA Email Address (déjalo en blanco)
   - **Request is:** Saved to disk
4. Haz clic en **Continue** y guarda como `CertificateSigningRequest-2027.csr`

---

## Paso 4: Subir CSR a Apple Developer Portal

1. En Apple Developer Portal, navega a **Certificates, Identifiers & Profiles**
2. Selecciona **Certificates** en el menú lateral
3. Haz clic en **+** para crear un nuevo certificado
4. Selecciona **Pass Type ID Certificates**
5. En el paso "Select Pass Type ID", elige `pass.com.xpectros.memberships`
6. Haz clic en **Continue**
7. Sube tu archivo `CertificateSigningRequest-2027.csr`
8. Haz clic en **Continue** y descarga el nuevo certificado

**El archivo descargado será:** `pass.cer` o similar

---

## Paso 5: Procesar el Nuevo Certificado

### 5.1 Convertir a PEM (si es necesario)

Si el certificado descargado está en formato DER (.cer), conviértelo:

```bash
cd /Users/carlos/Documents/personal/carder/certificates/originals

# Convertir certificado a PEM
openssl x509 -inform der -in pass-2027.cer -out pass-2027.pem -outform pem

# Verificar el certificado
openssl x509 -in pass-2027.pem -noout -text | grep -A 2 "Validity"
```

### 5.2 Renombrar o Reemplazar Archivos

**Opción A: Hacer backup del certificado actual (Recomendado)**

```bash
# Hacer backup
cd /Users/carlos/Documents/personal/carder/certificates/originals
mkdir -p ../backup-2027
cp pass.pem ../backup-2027/pass.pem.old
cp privateKey.key ../backup-2027/privateKey.key.old

# Reemplazar con nuevo certificado
mv pass-2027.pem pass.pem
mv privateKey-2027.key privateKey.key
```

**Opción B: Reemplazar directamente**

```bash
cd /Users/carlos/Documents/personal/carder/certificates/originals

# Reemplazar archivos existentes
mv pass-2027.pem pass.pem
mv privateKey-2027.key privateKey.key
```

### 5.3 Verificar WWDRCA Certificate

El certificado Apple WWDRCA (Worldwide Developer Relations Certification Authority) probablemente siga siendo válido en 2027.

Para verificar:
```bash
openssl x509 -in AppleWWDRCAG4.pem -noout -dates
```

Si expira antes de mayo de 2027, descarga uno nuevo desde:
[https://www.apple.com/certificateauthority/](https://www.apple.com/certificateauthority/)

---

## Paso 6: Actualizar Configuración

### 6.1 Verificar archivo de configuración

El archivo `src/config.js` ya tiene las rutas correctas:

```javascript
export const config = {
  port: process.env.PORT || 3000,

  apple: {
    passCertificatePath: './certificates/originals/pass.pem',
    passPrivateKeyPath: './certificates/originals/privateKey.key',
    appleWWDRCAPath: './certificates/originals/AppleWWDRCAG4.pem',
    teamIdentifier: '428JSB6QUW',
    passTypeIdentifier: 'pass.com.xpectros.memberships'
  },

  template: {
    templatePath: './templates',
    defaultBackgroundColor: '#1a1a2e',
    defaultForegroundColor: '#ffffff',
    defaultLabelColor: '#e94560'
  }
}
```

**Importante:** No necesitas cambiar `teamIdentifier` ni `passTypeIdentifier` a menos que hayas creado IDs nuevos.

### 6.2 Actualizar Certificados en Server

Si el servidor está corriendo, reinícialo:

```bash
# Detener servidor (Ctrl+C en la terminal donde corre)
# O matar el proceso
pkill -f "node src/index.js"

# Reiniciar servidor
npm start
```

---

## Paso 7: Probar Nuevo Certificado

### 7.1 Generar Pass de Prueba

```bash
# Usar el script de prueba existente
node create-test-pass.js
```

### 7.2 Verificar el Pass Generado

```bash
# Extraer y verificar contenido
mkdir -p /tmp/verify-2027
unzip -q test-membership.pkpass -d /tmp/verify-2027

# Verificar estructura
ls -la /tmp/verify-2027

# Verificar manifest
cat /tmp/verify-2027/manifest.json

# Verificar firma
openssl smime -verify -inform DER -in /tmp/verify-2027/signature \
  -CAfile /Users/carlos/Documents/personal/carder/certificates/originals/AppleWWDRCAG4.pem \
  -noverify -content /tmp/verify-2027/manifest.json
```

**Resultado esperado:** `Verification successful`

### 7.3 Probar en Dispositivo Real

1. AirDrop `test-membership.pkpass` a tu iPhone/iPad
2. Toca el archivo para abrirlo
3. Debería abrirse en Apple Wallet
4. Si hay errores, revisa el siguiente paso

---

## Solución de Problemas Comunes

### Problema 1: "Signature verification failure"

**Causa:** Hashes en manifest.json no coinciden con archivos reales

**Solución:**
```bash
# Recalcular hashes
shasum /tmp/verify-2027/pass.json
# Comparar con hash en manifest.json
```

### Problema 2: "Pass cannot be installed"

**Causa:** Team ID o Pass Type ID incorrecto en pass.json

**Solución:**
```bash
# Verificar que coinciden
openssl x509 -in pass.pem -noout -subject
# Debe mostrar: UID=pass.com.xpectros.memberships
```

### Problema 3: "Unable to get local issuer certificate"

**Causa:** Certificado WWDRCA no está incluido en la firma

**Solución:**
```bash
# Asegúrate de que certs-chain.pem contiene ambos certificados
cat certificates/originals/pass.pem certificates/originals/AppleWWDRCAG4.pem > certificates/certs-chain.pem
```

### Problema 4: "Certificate expired"

**Causa:** El certificado ha expirado

**Solución:** Sigue esta guía completa desde el Paso 1.

---

## Información Importante para 2027

### Team ID
- **Valor actual:** `428JSB6QUW`
- **No cambia:** Este ID es permanente para tu cuenta de Apple Developer
- **Dónde encontrarlo:** En Apple Developer Portal > Account > Membership

### Pass Type ID
- **Valor actual:** `pass.com.xpectros.memberships`
- **Formato:** `pass.com.bundlename.passname`
- **Mismo que:** El que usas en `config.js` y `templates/membership.pass/pass.json`

### WWDRCA Certificate
- **Nombre:** Apple Worldwide Developer Relations Certification Authority, G4
- **Actual:** G4 (expira alrededor de 2030)
- **Si expira:** Descarga el más reciente desde [Apple Certificate Authority](https://www.apple.com/certificateauthority/)

---

## Checklist de Renovación

Antes de empezar la renovación:
- [ ] Tienes acceso a Apple Developer Account
- [ ] Conoces tu Team ID (`428JSB6QUW`)
- [ ] Conoces tu Pass Type ID (`pass.com.xpectros.memberships`)
- [ ] Tienes OpenSSL instalado (o Keychain Access en macOS)

Durante el proceso de renovación:
- [ ] CSR generado con el mismo Pass Type ID
- [ ] Certificado descargado de Apple Developer Portal
- [ ] Certificado convertido a PEM (si necesario)
- [ ] Archivos antiguos respaldados
- [ ] Archivos nuevos instalados en `certificates/originals/`
- [ ] Configuración verificada en `src/config.js`

Después de la renovación:
- [ ] Servidor reiniciado
- [ ] Pass de prueba generado
- [ ] Firma verificada con OpenSSL
- [ ] Pass probado en iPhone/iPad
- [ ] Pass se añadió correctamente a Apple Wallet

---

## Scripts de Ayuda

### Script para generar CSR automáticamente

Guarda esto como `generate-csr-2027.sh`:

```bash
#!/bin/bash

CSR_DIR="/Users/carlos/Documents/personal/carder/certificates/originals"

cd "$CSR_DIR"

openssl req -nodes -newkey rsa:2048 \
  -keyout privateKey-2027.key \
  -out CertificateSigningRequest-2027.csr \
  -subj "/C=MX/ST=CDMX/L=Ciudad de México/O=TU NOMBRE/CN=Pass Type ID: pass.com.xpectros.memberships"

echo "✓ CSR generado"
echo "✓ Llave privada guardada: privateKey-2027.key"
echo "✓ CSR guardado: CertificateSigningRequest-2027.csr"
echo ""
echo "Siguiente paso: Sube CertificateSigningRequest-2027.csr a Apple Developer Portal"
```

Hacer ejecutable:
```bash
chmod +x generate-csr-2027.sh
./generate-csr-2027.sh
```

### Script para verificar certificados

Guarda esto como `verify-cert-2027.sh`:

```bash
#!/bin/bash

CERT_DIR="/Users/carlos/Documents/personal/carder/certificates/originals"

echo "=== Verificando Certificado Pass ==="
openssl x509 -in "$CERT_DIR/pass.pem" -noout -dates -subject

echo ""
echo "=== Verificando Llave Privada ==="
openssl rsa -in "$CERT_DIR/privateKey.key" -noout -text | head -5

echo ""
echo "=== Verificando WWDRCA ==="
openssl x509 -in "$CERT_DIR/AppleWWDRCAG4.pem" -noout -dates

echo ""
echo "✓ Todos los certificados verificados"
```

---

## Recursos

- [Apple Developer Documentation - Passes](https://developer.apple.com/wallet/)
- [Certificate Authority - Apple](https://www.apple.com/certificateauthority/)
- [PassKit Programming Guide](https://developer.apple.com/library/archive/documentation/PassKit/Reference/PassKit_Type_Reference/)
- [passkit-generator Library](https://github.com/alexandercerutti/passkit-generator)

---

## Resumen del Proceso Actual

**Pasos completados en 2026:**
1. ✅ Crear CSR
2. ✅ Subir CSR a Apple Developer Portal
3. ✅ Descargar certificado (.cer)
4. ✅ Convertir a PEM
5. ✅ Implementar generación de passes con passkit-generator
6. ✅ Probar en iPhone/iPad
7. ✅ Verificar que funciona correctamente

**Para repetir en 2027:**
Sigue esta guía desde el Paso 1. El proceso será idéntico.

---

**Nota de mantenimiento:** Guía creada el 8 de abril de 2026 para renovación en mayo de 2027.
