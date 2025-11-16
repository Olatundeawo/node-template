/* eslint-disable import/newline-after-import */
/* app.js */
const express = require('express');
const bodyParser = require('body-parser');
const { parseInstruction } = require('../../utils/parser');
const app = express();

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));

// Example route
app.post('/payment-instructions', (req, res) => {
  const { accounts, instruction } = req.body;

  if (!accounts || !instruction) {
    return res.status(400).json({
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: 'failed',
      status_reason: 'Missing accounts or instruction',
      status_code: 'SY03',
      accounts: [],
    });
  }

  const result = parseInstruction(instruction, accounts);
  const statusCode = result.status === 'failed' ? 400 : 200;
  return res.status(statusCode).json(result);
});

// Health check route
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Set host and port for Render
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

// Fix timeout issues on Render
server.keepAliveTimeout = 120000; // 120 seconds
server.headersTimeout = 120000;

module.exports = app;
