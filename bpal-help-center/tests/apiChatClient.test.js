const test = require('node:test');
const assert = require('node:assert/strict');
const { apiConfig, checkApi, askApi } = require('../apiChatClient');

test('reads the tenant API credentials, never Groq credentials', () => {
  const a = apiConfig({ env: { HELPASSISTANT_API_URL: 'http://127.0.0.1:8000', HELPASSISTANT_API_KEY: 'tenant-key', GROQ_API_KEY: 'provider-key' } });
  assert.equal(a.configured, true);
  assert.equal(a.apiKey, 'tenant-key');
});
test('rejects placeholder configuration', () => {
  assert.equal(apiConfig({ env: { HELPASSISTANT_API_URL: 'http://127.0.0.1:8000', HELPASSISTANT_API_KEY: 'REPLACE_WITH_CUSTOMER_API_KEY' } }).configured, false);
});
test('chat uses POST /chat and preserves server conversation id', async () => {
  let seen;
  const fetchImpl = async (url, options) => {
    seen = { url, options };
    return { ok: true, json: async () => ({ answer: 'Folder instructions', conversation_id: 'uuid-123', retrieval_count: 2, model_provider: 'groq' }) };
  };
  const config = apiConfig({ env: { HELPASSISTANT_API_URL: 'http://127.0.0.1:8000', HELPASSISTANT_API_KEY: 'tenant-key' } });
  const result = await askApi(config, { question: 'Folder?', conversation_id: null }, { fetchImpl });
  assert.equal(seen.url, 'http://127.0.0.1:8000/chat');
  assert.equal(seen.options.headers.Authorization, 'Bearer tenant-key');
  assert.equal(JSON.parse(seen.options.body).question, 'Folder?');
  assert.equal(result.conversation_id, 'uuid-123');
});
test('health check exposes missing public route', async () => {
  const config = apiConfig({ env: { HELPASSISTANT_API_URL: 'http://127.0.0.1:8000', HELPASSISTANT_API_KEY: 'tenant-key' } });
  const response = await checkApi(config, { fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ detail: 'Not Found' }) }) });
  assert.match(response.error, /HTTP 404/);
});
