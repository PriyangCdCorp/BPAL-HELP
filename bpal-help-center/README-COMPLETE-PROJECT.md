# BPAL Help Center — Complete Electron source project

This is the **complete Electron Help Center source** supplied in the original `help-center(1).zip`, with the Milestone 3 CMS integration merged in. It includes its original renderer, styling, icons, documentation/assets, package manifests, Registry integration, Assistant files, plus `cmsHelpContent.js` and tests.

## What this is (and is not)

- This is a complete **source project** for the BPAL Help Center EXE, not a prebuilt Windows EXE.
- The FastAPI CMS backend and the React CMS Admin Portal are **separate applications**; they are not part of this Electron source archive.
- The existing user interface remains, while Assistant chat now uses the FastAPI `/chat` endpoint. CMS integration covers Tips & Tricks and What's New.
- The Windows installer cannot be built/tested in this Linux environment; run the build on your Windows development machine.

## Windows setup

1. Install Node.js LTS and open PowerShell in this folder.
2. Run `npm ci` (or `npm install` if needed).
3. For local development, copy `.env.example` to `.env` and set `HELPASSISTANT_API_URL` and your **customer** API key. Do not put a CMS administrator token here.
4. Start the backend separately at the configured URL; make sure `/content/tips`, `/content/whats-new` and `/content/media/{media_id}` work with that customer API key.
5. Run `npm run test:cms`, then `npm start` to open the Help Center.
6. To create a Windows installer: `npm run dist` (Electron Builder NSIS x64); output is typically in `dist/`. Do not assume the installer succeeded without checking the build log.

## Deployment notes

- **Production API configuration** is resolved through environment variables or Windows Registry at `HKLM\SOFTWARE\WOW6432Node\Circuit Design Corporation\CDCB` (`HELPASSISTANT_API_URL`, `HELPASSISTANT_API_KEY`). The `.env` file is intentionally **not bundled into the EXE** to avoid exposing customer credentials.
- The app may depend on other BPAL-specific Registry values and data folders for legacy fallback. Run it from your original BPAL environment when validating the full application.
- **CMS image access:** uploaded images must be attached to the content item and available via the customer-facing `GET /content/media/{media_id}` route. The administrator-facing media route is different.
- CMS content uses the original UI renderer. When API content is unavailable, the original local-file fallback is retained.
- Assistant IPC handlers call the FastAPI `/chat` endpoint, using customer authentication. The legacy local chat modules are present for historical compatibility but are no longer used for user chat.
- Before releasing to customers, verify Windows installer resources, the media flow, tenant isolation, content rendering, and the Assistant's actual runtime behavior.

## Source files of particular interest

- `main.js`: Electron main process and CMS content IPC integration
- `cmsHelpContent.js`: CMS API adapter, content shape mapping, authenticated media cache
- `preload.js`: IPC bridge
- `index.html`, `JS/tips.js`, `CSS/tips.css`: employee Help Center UI
- `JS/chat.js`, `chatPipeline.js`: existing local assistant behavior
- `registryHelper.js`: Windows Registry settings
- `tests/cmsHelpContent.test.js`: adapter tests
- `package.json`: start/build scripts, and packaging configuration includes `cmsHelpContent.js`

## Fixing the "missing API key" and CMS HTTP 404

The Electron client needs `HELPASSISTANT_API_URL` and `HELPASSISTANT_API_KEY` (tenant/customer bearer key). Do **not** enter `GROQ_API_KEY` or the admin portal session token in the Electron client. For local testing, create `.env` in the same folder as `main.js`:

```env
HELPASSISTANT_API_URL=http://127.0.0.1:8000
HELPASSISTANT_API_KEY=YOUR_CUSTOMER_KEY_HERE
```

The default `.env.example` is illustrative, not configured. The backend must serve `GET /content/tips`, `GET /content/whats-new`, and `POST /chat`. Confirm these endpoints in Swagger on the **same host and port** Electron uses. A 404 means the requested route wasn't available on the server the client reached. When development runs on a different machine, `127.0.0.1` is **the customer's machine**, not the server. Use the appropriate HTTPS server URL in that case.

Run `npm run test:api` and `npm run test:cms` before `npm start`. The current FastAPI endpoint returns a complete answer, so the client displays it when ready rather than token-streaming it.

For production, use the application's Windows Registry API settings. Never bundle Groq credentials in the employee EXE, and never commit an actual customer API key.
