// Run from project root: node scripts/checkApiConnection.js
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { checkApi } = require('../apiChatClient');
const { readCustomerApiConfig } = require('../customerApiConfig');
(async () => {
  const config = readCustomerApiConfig();
  console.log('API URL:', config.apiUrl || '(missing or invalid)');
  console.log('Customer API key:', config.apiKey ? '(configured)' : '(missing)');
  if (!config.configured) { console.error(config.reason); process.exitCode = 1; return; }
  const status = await checkApi(config);
  if (!status.ok) { console.error('Connection check failed:', status.error); process.exitCode = 1; return; }
console.log('FastAPI health and authenticated chat checks passed.');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
