const test = require('node:test');
const assert = require('node:assert/strict');
const { readCustomerApiConfig } = require('../customerApiConfig');
test('registry takes precedence over .env', () => {
 const c=readCustomerApiConfig({HELPASSISTANT_API_URL:'http://localhost:9000',HELPASSISTANT_API_KEY:'env-key'}, name=> name==='HELPASSISTANT_API_URL'?'http://127.0.0.1:8000/':'registry-key');
 assert.equal(c.apiUrl,'http://127.0.0.1:8000'); assert.equal(c.apiKey,'registry-key');
});
test('falls back to .env when registry is missing',()=>{
 const c=readCustomerApiConfig({HELPASSISTANT_API_URL:'http://localhost:9000/',HELPASSISTANT_API_KEY:'env-key'}, ()=> '');
 assert.equal(c.apiUrl,'http://localhost:9000'); assert.equal(c.apiKey,'env-key');
});
