REGISTRY FIX — BPAL Help Center

This release fixes npm run check:api incorrectly reporting missing configuration.
The same Registry-first resolver is now used by the Electron main process and the CLI checker.

Registry path: HKLM\SOFTWARE\WOW6432Node\Circuit Design Corporation\CDCB
Required REG_SZ values: HELPASSISTANT_API_URL and HELPASSISTANT_API_KEY

Files changed: main.js, scripts/checkApiConnection.js, package.json
Files added: customerApiConfig.js, tests/customerApiConfig.test.js

From BPAL-Help-Center:
    npm install
    node --test tests/customerApiConfig.test.js
    npm run check:api
    npm start

Do not paste the customer API key into chat or application logs.
If check:api now shows an HTTP 404, configuration is fixed; verify /content/tips is exposed by the running FastAPI backend.
If it shows 401, verify the client key belongs to the running backend's database.
