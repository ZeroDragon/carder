import { PKPass } from 'passkit-generator';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

export class PassGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, '..', config.template.templatePath);
  }

  base64ToBuffer(base64String) {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  async resizeImageIfNeeded(buffer, maxWidth, maxHeight) {
    const tempPath = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempPath, { recursive: true });
    
    const inputPath = path.join(tempPath, `input_${crypto.randomUUID()}.png`);
    const outputPath = path.join(tempPath, `output_${crypto.randomUUID()}.png`);

    try {
      await fs.writeFile(inputPath, buffer);

      await execAsync(`ffmpeg -i ${inputPath} -vf "scale='min(${maxWidth},iw)':'min(${maxHeight},ih)'" ${outputPath}`);

      const outputBuffer = await fs.readFile(outputPath);

      await fs.unlink(inputPath);
      await fs.unlink(outputPath);

      return outputBuffer;
    } catch (error) {
      console.error('Error resizing image:', error);

      try {
        await fs.unlink(inputPath);
      } catch (e) {}
      try {
        await fs.unlink(outputPath);
      } catch (e) {}

      throw error;
    }
  }

  async generatePass(passData) {
    const modelPath = path.join(__dirname, '..', 'templates', 'membership.pass');

    // Create pass instance from model
    const pass = await PKPass.from({
      model: modelPath,
      certificates: {
        wwdr: await fs.readFile(path.resolve(__dirname, '..', config.apple.appleWWDRCAPath)),
        signerCert: await fs.readFile(path.resolve(__dirname, '..', config.apple.passCertificatePath)),
        signerKey: (await fs.readFile(path.resolve(__dirname, '..', config.apple.passPrivateKeyPath))).toString()
      }
    }, {
      serialNumber: crypto.randomUUID(),
      description: passData.description || 'Mi Pass',
      organizationName: passData.organizationName || 'Mi Organización',
      logoText: passData.logoText || '',
      backgroundColor: passData.backgroundColor || '#1a1a2e',
      foregroundColor: passData.foregroundColor || '#ffffff',
      labelColor: passData.labelColor || '#e94560',
      stripColor: passData.stripColor
    });

    // Add images if provided
    if (passData.images) {
      if (passData.images.icon) {
        const iconBuffer = this.base64ToBuffer(passData.images.icon);
        const resizedIcon = await this.resizeImageIfNeeded(iconBuffer, 29, 29);
        pass.addBuffer('icon.png', resizedIcon);
      }
      if (passData.images.icon2x) {
        const icon2xBuffer = this.base64ToBuffer(passData.images.icon2x);
        const resizedIcon2x = await this.resizeImageIfNeeded(icon2xBuffer, 58, 58);
        pass.addBuffer('icon@2x.png', resizedIcon2x);
      }
      if (passData.images.logo) {
        const logoBuffer = this.base64ToBuffer(passData.images.logo);
        const resizedLogo = await this.resizeImageIfNeeded(logoBuffer, 120, 120);
        pass.addBuffer('logo.png', resizedLogo);
      }
      if (passData.images.logo2x) {
        const logo2xBuffer = this.base64ToBuffer(passData.images.logo2x);
        const resizedLogo2x = await this.resizeImageIfNeeded(logo2xBuffer, 240, 240);
        pass.addBuffer('logo@2x.png', resizedLogo2x);
      }
      if (passData.images.background) {
        const backgroundBuffer = this.base64ToBuffer(passData.images.background);
        pass.addBuffer('background.png', backgroundBuffer);
      }
      if (passData.images.background2x) {
        const background2xBuffer = this.base64ToBuffer(passData.images.background2x);
        pass.addBuffer('background@2x.png', background2xBuffer);
      }
      if (passData.images.thumbnail) {
        const thumbnailBuffer = this.base64ToBuffer(passData.images.thumbnail);
        const resizedThumbnail = await this.resizeImageIfNeeded(thumbnailBuffer, 300, 300);
        pass.addBuffer('thumbnail.png', resizedThumbnail);
      }
      if (passData.images.thumbnail2x) {
        const thumbnail2xBuffer = this.base64ToBuffer(passData.images.thumbnail2x);
        const resizedThumbnail2x = await this.resizeImageIfNeeded(thumbnail2xBuffer, 600, 600);
        pass.addBuffer('thumbnail@2x.png', resizedThumbnail2x);
      }
      if (passData.images.strip) {
        const stripBuffer = this.base64ToBuffer(passData.images.strip);
        const resizedStrip = await this.resizeImageIfNeeded(stripBuffer, 390, 123);
        pass.addBuffer('strip.png', resizedStrip);
      }
      if (passData.images.strip2x) {
        const strip2xBuffer = this.base64ToBuffer(passData.images.strip2x);
        const resizedStrip2x = await this.resizeImageIfNeeded(strip2xBuffer, 780, 246);
        pass.addBuffer('strip@2x.png', resizedStrip2x);
      }
    }

    // Set pass type if provided
    if (passData.type) {
      pass.type = passData.type;
    }

    // Set transit type for boarding passes
    if (passData.transitType && passData.type === 'boardingPass') {
      pass.transitType = passData.transitType;
    }

    // Add primary fields
    if (passData.primaryFields && Array.isArray(passData.primaryFields)) {
      passData.primaryFields.forEach(field => {
        pass.primaryFields.push({
          key: field.key || crypto.randomUUID(),
          label: field.label || '',
          value: field.value || ''
        });
      });
    }

    // Add secondary fields
    if (passData.secondaryFields && Array.isArray(passData.secondaryFields)) {
      passData.secondaryFields.forEach(field => {
        pass.secondaryFields.push({
          key: field.key || crypto.randomUUID(),
          label: field.label || '',
          value: field.value || ''
        });
      });
    }

    // Add auxiliary fields
    if (passData.auxiliaryFields && Array.isArray(passData.auxiliaryFields)) {
      passData.auxiliaryFields.forEach(field => {
        pass.auxiliaryFields.push({
          key: field.key || crypto.randomUUID(),
          label: field.label || '',
          value: field.value || ''
        });
      });
    }

    // Add header fields
    if (passData.headerFields && Array.isArray(passData.headerFields)) {
      passData.headerFields.forEach(field => {
        pass.headerFields.push({
          key: field.key || crypto.randomUUID(),
          label: field.label || '',
          value: field.value || ''
        });
      });
    }

    // Add back fields
    if (passData.backFields && Array.isArray(passData.backFields)) {
      passData.backFields.forEach(field => {
        pass.backFields.push({
          key: field.key || crypto.randomUUID(),
          label: field.label || '',
          value: field.value || ''
        });
      });
    }

    // Add additional info fields (iOS 18+ for event tickets)
    if (passData.additionalInfoFields && Array.isArray(passData.additionalInfoFields) && passData.type === 'eventTicket') {
      passData.additionalInfoFields.forEach(field => {
        pass.additionalInfoFields.push({
          key: field.key || crypto.randomUUID(),
          label: field.label || '',
          value: field.value || ''
        });
      });
    }

    // Add barcode if provided
    if (passData.barcodes || passData.barcode) {
      const barcode = passData.barcodes ? passData.barcodes[0] : passData.barcode;
      pass.setBarcodes({
        format: barcode.format || 'PKBarcodeFormatQR',
        message: barcode.message || '',
        messageEncoding: 'iso-8859-1',
        altText: barcode.altText || barcode.message
      });
    }

    // Set expiration date if provided
    if (passData.expirationDate) {
      pass.setExpirationDate(new Date(passData.expirationDate));
    }

    // Set relevant date if provided
    if (passData.relevantDate) {
      pass.setRelevantDate(new Date(passData.relevantDate));
    }

    // Generate pass buffer
    const passBuffer = pass.getAsBuffer();
    return passBuffer;
  }
}
