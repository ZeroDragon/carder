import fs from 'fs';
import http from 'http';

const data = JSON.stringify({
  type: 'generic',
  description: 'Xpectros Membership',
  logoText: 'Xpectros',
  organizationName: 'Xpectros',
  backgroundColor: '#1a1a2e',
  foregroundColor: '#ffffff',
  labelColor: '#e94560',
  images: {
    icon: './templates/icon.png'
  },
  primaryFields: [
    {
      key: 'name',
      label: 'Name',
      value: 'Carlos Fernando'
    }
  ],
  secondaryFields: [
    {
      key: 'membership',
      label: 'Membership',
      value: 'Premium'
    },
    {
      key: 'id',
      label: 'Member ID',
      value: 'XP-12345'
    }
  ],
  auxiliaryFields: [
    {
      key: 'valid',
      label: 'Valid Until',
      value: 'Dec 31, 2026'
    }
  ],
  barcode: {
    format: 'PKBarcodeFormatQR',
    message: 'https://xpectros.com/member/XP-12345',
    altText: 'XP-12345'
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/pass',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Content-Type: ${res.headers['content-type']}`);

  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const passBuffer = Buffer.concat(chunks);
    fs.writeFileSync('test-membership.pkpass', passBuffer);
    console.log('\n✓ Pass saved to: test-membership.pkpass');
    console.log('\nTo test on iOS:');
    console.log('1. Send this file to your iPhone/iPad');
    console.log('2. Tap the file to open it');
    console.log('3. Add to Apple Wallet');
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
