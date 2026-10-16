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
    const match = base64String.match(/^data:(image\/\w+);base64,/);
    const mimeType = match ? match[1] : 'image/png';
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    return {
      buffer: Buffer.from(base64Data, 'base64'),
      mimeType
    };
  }

  async convertAndScaleToPng(imageData, scaleFactor) {
    const { buffer, mimeType } = imageData;
    
    // If already PNG and scale is 1.0, return as is
    if (mimeType === 'image/png' && scaleFactor === 1.0) {
      return buffer;
    }
    
    const tempPath = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempPath, { recursive: true });
    
    // Determine file extension based on MIME type
    const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg' ? '.jpg' : '.png';
    
    const inputPath = path.join(tempPath, `input_${crypto.randomUUID()}${extension}`);
    const outputPath = path.join(tempPath, `output_${crypto.randomUUID()}.png`);

    try {
      await fs.writeFile(inputPath, buffer);

      // Convert to PNG and scale
      const scaleFilter = scaleFactor === 1.0 
        ? '' 
        : `-vf "scale=iw*${scaleFactor}:ih*${scaleFactor}"`;
      await execAsync(`ffmpeg -i ${inputPath} ${scaleFilter} ${outputPath}`);

      const outputBuffer = await fs.readFile(outputPath);

      await fs.unlink(inputPath);
      await fs.unlink(outputPath);

      return outputBuffer;
    } catch (error) {
      console.error('Error converting/scaling image:', error);

      try {
        await fs.unlink(inputPath);
      } catch (e) {}
      try {
        await fs.unlink(outputPath);
      } catch (e) {}

      throw error;
    }
  }

  async convertToPngIfNeeded(imageData) {
    const { buffer, mimeType } = imageData;
    
    // If already PNG, return as is
    if (mimeType === 'image/png') {
      return buffer;
    }
    
    const tempPath = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempPath, { recursive: true });
    
    // Determine file extension based on MIME type
    const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg' ? '.jpg' : '.png';
    
    const inputPath = path.join(tempPath, `input_${crypto.randomUUID()}${extension}`);
    const outputPath = path.join(tempPath, `output_${crypto.randomUUID()}.png`);

    try {
      await fs.writeFile(inputPath, buffer);

      // Convert to PNG (no resizing)
      await execAsync(`ffmpeg -i ${inputPath} ${outputPath}`);

      const outputBuffer = await fs.readFile(outputPath);

      await fs.unlink(inputPath);
      await fs.unlink(outputPath);

      return outputBuffer;
    } catch (error) {
      console.error('Error converting image to PNG:', error);

      try {
        await fs.unlink(inputPath);
      } catch (e) {}
      try {
        await fs.unlink(outputPath);
      } catch (e) {}

      throw error;
    }
  }

  async generateDefaultLogo(size, backgroundColor = '#1a1a2e') {
    const tempPath = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempPath, { recursive: true });
    
    const outputPath = path.join(tempPath, `default-logo-${size}.png`);

    try {
      // Generate a solid color square using ffmpeg
      await execAsync(`ffmpeg -f lavfi -i color=c=${backgroundColor.replace('#', '')}:s=${size}x${size}:d=1 -frames:v 1 ${outputPath}`);

      const outputBuffer = await fs.readFile(outputPath);

      await fs.unlink(outputPath);

      return outputBuffer;
    } catch (error) {
      console.error('Error generating default logo:', error);

      try {
        await fs.unlink(outputPath);
      } catch (e) {}

      throw error;
    }
  }

  async resizeImageIfNeeded(imageData, maxWidth, maxHeight) {
    const { buffer, mimeType } = imageData;
    const tempPath = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempPath, { recursive: true });
    
    // Determine file extension based on MIME type
    const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg' ? '.jpg' : '.png';
    
    const inputPath = path.join(tempPath, `input_${crypto.randomUUID()}${extension}`);
    const outputPath = path.join(tempPath, `output_${crypto.randomUUID()}.png`);

    try {
      await fs.writeFile(inputPath, buffer);

      // Convert to PNG and resize in one command (ffmpeg handles JPG to PNG conversion)
      await execAsync(`ffmpeg -i ${inputPath} -vf "scale='min(${maxWidth},iw)':'min(${maxHeight},ih)'" ${outputPath}`);

      const outputBuffer = await fs.readFile(outputPath);

      await fs.unlink(inputPath);
      await fs.unlink(outputPath);

      return outputBuffer;
    } catch (error) {
      console.error('Error resizing/converting image:', error);

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
      logoText: passData.logoText || 'PASS',
      backgroundColor: passData.backgroundColor || '#1a1a2e',
      foregroundColor: passData.foregroundColor || '#ffffff',
      labelColor: passData.labelColor || '#e94560',
      stripColor: passData.stripColor
    });

    // Add images if provided or use defaults
    if (!passData.images) {
      passData.images = {};
    }

    // Icon - generate 1x from 2x if needed, or use default
    if (passData.images.icon2x) {
      const icon2xData = this.base64ToBuffer(passData.images.icon2x);
      const resizedIcon2x = await this.resizeImageIfNeeded(icon2xData, 58, 58);
      pass.addBuffer('icon@2x.png', resizedIcon2x);

      // Generate 1x version from 2x
      const icon1xData = this.base64ToBuffer(passData.images.icon2x);
      const resizedIcon = await this.resizeImageIfNeeded(icon1xData, 29, 29);
      pass.addBuffer('icon.png', resizedIcon);
    } else {
      // Use default icon if none provided
      const defaultIcon2x = await this.generateDefaultLogo(58, passData.backgroundColor || '#1a1a2e');
      pass.addBuffer('icon@2x.png', defaultIcon2x);

      const defaultIcon1x = await this.generateDefaultLogo(29, passData.backgroundColor || '#1a1a2e');
      pass.addBuffer('icon.png', defaultIcon1x);
    }

    // Logo - generate 1x from 2x if needed, or use default
    if (passData.images.logo2x) {
      const logo2xData = this.base64ToBuffer(passData.images.logo2x);
      const resizedLogo2x = await this.resizeImageIfNeeded(logo2xData, 240, 240);
      pass.addBuffer('logo@2x.png', resizedLogo2x);

      // Generate 1x version from 2x
      const logo1xData = this.base64ToBuffer(passData.images.logo2x);
      const resizedLogo = await this.resizeImageIfNeeded(logo1xData, 120, 120);
      pass.addBuffer('logo.png', resizedLogo);
    } else {
      // Use default logo if none provided
      const defaultLogo2x = await this.generateDefaultLogo(240, passData.backgroundColor || '#1a1a2e');
      pass.addBuffer('logo@2x.png', defaultLogo2x);

      const defaultLogo1x = await this.generateDefaultLogo(120, passData.backgroundColor || '#1a1a2e');
      pass.addBuffer('logo.png', defaultLogo1x);
    }

    // Background - generate 1x from 2x if needed
    if (passData.images.background2x) {
      const background2xData = this.base64ToBuffer(passData.images.background2x);
      // Convert to PNG and scale down by half
      const pngBackground2x = await this.convertAndScaleToPng(background2xData, 0.5);
      pass.addBuffer('background@2x.png', pngBackground2x);

      // Generate 1x version from 2x (scale down by half again)
      const background1xData = this.base64ToBuffer(passData.images.background2x);
      const pngBackground = await this.convertAndScaleToPng(background1xData, 0.25);
      pass.addBuffer('background.png', pngBackground);
    }

    // Thumbnail - generate 1x from 2x if needed
    if (passData.images.thumbnail2x) {
      const thumbnail2xData = this.base64ToBuffer(passData.images.thumbnail2x);
      const resizedThumbnail2x = await this.resizeImageIfNeeded(thumbnail2xData, 600, 600);
      pass.addBuffer('thumbnail@2x.png', resizedThumbnail2x);

      // Generate 1x version from 2x
      const thumbnail1xData = this.base64ToBuffer(passData.images.thumbnail2x);
      const resizedThumbnail = await this.resizeImageIfNeeded(thumbnail1xData, 300, 300);
      pass.addBuffer('thumbnail.png', resizedThumbnail);
    }

    // Strip - generate 1x from 2x if needed
    if (passData.images.strip2x) {
      const strip2xData = this.base64ToBuffer(passData.images.strip2x);
      const resizedStrip2x = await this.resizeImageIfNeeded(strip2xData, 780, 246);
      pass.addBuffer('strip@2x.png', resizedStrip2x);

      // Generate 1x version from 2x
      const strip1xData = this.base64ToBuffer(passData.images.strip2x);
      const resizedStrip = await this.resizeImageIfNeeded(strip1xData, 390, 123);
      pass.addBuffer('strip.png', resizedStrip);
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

    // Ensure at least one field exists (Apple Wallet requirement)
    const hasAnyField = pass.primaryFields.length > 0 ||
                       pass.secondaryFields.length > 0 ||
                       pass.auxiliaryFields.length > 0 ||
                       pass.headerFields.length > 0 ||
                       pass.backFields.length > 0 ||
                       (pass.additionalInfoFields && pass.additionalInfoFields.length > 0);

    if (!hasAnyField) {
      // Add a default primary field
      pass.primaryFields.push({
        key: crypto.randomUUID(),
        label: 'Estado',
        value: 'Activo'
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
