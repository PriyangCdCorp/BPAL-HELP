"use strict";
// Shared Registry-first configuration loader. Safe to call from plain Node.js.
const { execFileSync } = require('node:child_process');
const KEY = 'HKLM\\SOFTWARE\\WOW6432Node\\Circuit Design Corporation\\CDCB';
function readRegistryValue(name, exec = execFileSync) {
  if (process.platform !== 'win32') return '';
  try {
    const output = exec('reg.exe', ['query', KEY, '/v', name], {
      encoding: 'utf8', windowsHide: true, timeout: 5000, stdio: ['ignore', 'pipe', 'ignore']
    });
    const line = output.split(/\r?\n/).find(x =>
      new RegExp('^\\s*' + name + '\\s+REG_(?:SZ|EXPAND_SZ)\\s+', 'i').test(x)
    );
    const match = line && line.match(/\s+REG_(?:SZ|EXPAND_SZ)\s+(.+)\s*$/i);
    return match ? match[1].trim() : '';
  } catch { return ''; }
}
function readCustomerApiConfig(env = process.env, read = readRegistryValue) {
  const { apiConfig } = require('./apiChatClient');
  const registryUrl = read('HELPASSISTANT_API_URL');
  const registryKey = read('HELPASSISTANT_API_KEY');
  // Override env with Registry when configured, then use .env for missing values.
  return apiConfig({
    env: {
      HELPASSISTANT_API_URL: registryUrl || env.HELPASSISTANT_API_URL || '',
      HELPASSISTANT_API_KEY: registryKey || env.HELPASSISTANT_API_KEY || ''
    }
  });
}
module.exports = { readRegistryValue, readCustomerApiConfig };
