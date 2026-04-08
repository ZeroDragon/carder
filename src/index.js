import express from 'express';
import { PassGenerator } from './passGenerator.js';
import { config } from './config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const passGenerator = new PassGenerator();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.json({
    service: 'Apple Wallet Pass Generator',
    version: '1.0.0',
    demo: `http://localhost:${config.port}/demo.html`,
    endpoints: {
      'POST /pass': 'Generate a new Apple Wallet pass',
      'POST /pass/json': 'Generate pass and return as JSON',
      'GET /health': 'Health check'
    },
    usage: {
      passTypes: ['boardingPass', 'coupon', 'eventTicket', 'generic']
    }
  });
});

app.post('/pass', async (req, res) => {
  try {
    const passData = req.body;

    // Validate required fields
    if (!passData) {
      return res.status(400).json({ error: 'Request body is required' });
    }

    console.log('Generating pass with data:', passData);

    // Generate the pass
    const passBuffer = await passGenerator.generatePass(passData);

    // Send the .pkpass file
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="pass.pkpass"`);
    res.send(passBuffer);

    console.log('Pass generated successfully');
  } catch (error) {
    console.error('Error generating pass:', error);
    res.status(500).json({
      error: 'Failed to generate pass',
      message: error.message
    });
  }
});

app.post('/pass/json', async (req, res) => {
  try {
    const passData = req.body;

    // Validate required fields
    if (!passData) {
      return res.status(400).json({ error: 'Request body is required' });
    }

    console.log('Generating pass with data:', passData);

    // Generate the pass
    const passBuffer = await passGenerator.generatePass(passData);

    // Return as base64 encoded JSON (useful for testing)
    res.json({
      success: true,
      pass: passBuffer.toString('base64'),
      filename: 'pass.pkpass'
    });
  } catch (error) {
    console.error('Error generating pass:', error);
    res.status(500).json({
      error: 'Failed to generate pass',
      message: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Apple Wallet Pass Generator running on port ${config.port}`);
  console.log(`Visit http://localhost:${config.port} for API documentation`);
});
