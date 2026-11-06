# BPAL FastAPI — production hardening review candidate

**Review date:** 2026-11-03  
**Scope:** `API.zip` (FastAPI backend) and `admin.zip` (React CMS Admin Portal).  
**Important:** This is a hardening *release candidate*, **not** a fully production-certified deployment. The Electron application was not modified.

## Compatibility guarantees targeted

- Existing API paths and response models remain available: `POST /chat`, `GET /content/tips`, `GET /content/whats-new`, `GET /content/media/{id}`, `/admin-auth/*`, `/admin/cms/*`, legacy `/admin/clients` and document routes.
- Existing customer API-key and CMS administrator bearer-session mechanisms are retained.
- Existing SQLite content is preserved; only additive tables/indexes are created.
- The Admin Portal source ZIP supplied by the user was reviewed but not modified in this candidate.

## Hardening changes

1. **CMS media authorization:** published media now follows the same tenant and `visible_from`/`visible_to` checks as published content. Draft, expired and scheduled media are not returned to customers.
2. **Rich-text safety:** CMS HTML is sanitized on write **and on output** using Bleach; preserves supported Quill formatting (font family/size, line height, alignment, color, etc.) and CMS media links, removing scripts, event handlers, unsafe CSS and external images. **Migration caution:** non-CMS external image sources in old rich text are stripped. Move these images to CMS media storage before switching.
3. **Administrator login throttling:** 10 failed attempts / 15 minutes per email+client IP, stored in SQLite. This is defense in depth; a reverse proxy must ALSO enforce a global IP-level limit.
4. **Customer chat rate limiting:** 60 requests/minute per tenant by default, configurable with `CHAT_REQUESTS_PER_MINUTE`. 0 disables it. Rejects excessive requests with HTTP 429 and `Retry-After`.
5. **Embedding concurrency:** costly BGE-M3 query embedding and document indexing are moved to a threadpool with `EMBEDDING_CONCURRENCY` semaphore (default 1). The model is still CPU-heavy; benchmark target hardware.
6. **Production configuration:** `APP_ENV=production` hides `/docs`, `/redoc` and `/openapi.json` and validates that the model provider is configured, SQLite/media/upload paths are absolute, and a configured legacy admin key is at least 32 characters.
7. **CORS:** `CMS_ALLOWED_ORIGINS` can be set to the HTTPS Admin Portal origin instead of relying on localhost defaults.
8. **Private response headers:** `Cache-Control: no-store` for authenticated API routes; `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer` on all responses.
9. **CMS audit records:** CMS creation, update, publication, archiving and media changes now record the actual admin ID in the `actor` column. Older audit rows remain intact.
10. **Visibility timestamps:** new/edited dates are normalized to UTC. Reversed date ranges are rejected. Existing pre-patch rows remain unchanged: review older records with timezone offsets.
11. **Operational scripts:** `scripts/backup_production.py` (SQLite `.backup` + media) and `scripts/manage_admin.py` (list, disable, enable, role and reset-password with session revocation).

## Before upgrading an existing installation

1. **Stop writes and back up** the original `.env`, SQLite database and entire CMS media directory. Do not ship real API/provider/admin keys in ZIP files.
2. Extract this candidate into a new directory. Do not overwrite the working server in-place before staging tests.
3. Install dependencies into a fresh virtual environment from `requirements.txt` (Bleach is a new dependency). Pin all resolved versions once tested on your target Python/Windows version.
4. Configure `.env` using `.env.production.example`, with **real absolute** paths and your deployment-specific hostnames.
5. If moving to a new storage root, copy the existing DB and media to that location; point `DATABASE_PATH`, `CMS_MEDIA_DIR`, `DOCUMENT_UPLOAD_DIR` to the copied data.
6. **Test using your actual customer API key, existing database, and current Admin Portal** on a staging copy first.
7. Roll back by stopping the candidate and starting the original code with original SQLite/media backups. New rate limit tables are additive; do not delete production DB tables by hand.

## Recommended Windows startup

Run the API as a managed Windows service (WinSW/NSSM or another approved service manager), not an interactive `--reload` process. From the backend directory:

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Bind to loopback and put a reverse proxy with HTTPS in front of it. Use an HTTPS hostname in the customer's `HELPASSISTANT_API_URL` Registry value. Run **one worker initially** so the large embedding model is not loaded into memory multiple times. The OS, reverse proxy and model provider must support the expected traffic volume.

For a browser Admin Portal hosted at `https://cms.yourdomain.example`, set:

```env
CMS_ALLOWED_ORIGINS=https://cms.yourdomain.example
```

Build the portal for production with its actual reachable API base URL, for example:

```powershell
$env:VITE_API_BASE_URL = "https://help-api.yourdomain.example"
npm ci
npm run build
```

Serve the generated `dist` static site using a production web server, not Vite `npm run dev`.

## Backup and restore

In a **maintenance window without writes**, and while using the proper production environment:

```powershell
python scripts/backup_production.py --destination D:\BPALHelpBackups
```

The script creates a timestamped directory with `rag.sqlite3`, copied `cms_media` and `uploads` directories, and a manifest containing a SHA256 checksum of the backup DB. **Do a restore drill** on staging: stop API writes, replace the DB and media contents with the backup copies at the configured paths, start API and verify chat, tenant content and images. Back up secrets separately in an approved secret store.

## Tests completed in review environment

- `python -m pytest -q`: **19 passed** (original 14 plus 5 targeted hardening tests).
- `python -m compileall -q app scripts`: passed.
- Production-mode smoke test: `/docs` returned 404, `/health` returned 200.
- Backup script smoke test: SQLite backup passed `integrity_check`, media copied, manifest created.
- `npm ci --offline` was **not possible** because required packages were absent from the local npm cache; therefore the React production build and Windows browser tests **have not** been verified here.
- No actual production Groq call, full tenant soak test, Windows service test, TLS validation, load test, restore drill, or packaged Electron regression was performed here.

## Remaining release blockers and follow-ups

1. **Network edge / TLS:** install and test HTTPS termination, certificates, request size limits, connection/request timeouts, rate limits and admin endpoint restrictions behind a VPN or allowlist. Admin access is especially sensitive.
2. **Browser admin security:** the portal still stores its administrator bearer token in `localStorage`. Move to short-lived in-memory/session storage or a carefully designed secure cookie + CSRF architecture; deploy a strict tested CSP, and security-test rich-text rendering in the browser and Electron.
3. **Complete role design and administrator operations:** decide whether `EDITOR` should be able to delete chatbot documents; review admin account recovery, MFA, key rotation and central administrator/client provisioning. CLI is included for emergency account operations.
4. **Dependency and supply-chain checks:** pin Python versions/dependencies, run Python vulnerability scanning; run `npm ci`, `npm audit`, build and review frontend libraries on an internet-connected approved environment.
5. **Capacity testing:** test 10–20 concurrent users and document upload while chat runs; monitor memory, BGE-M3 model load, SQLite contention and provider latency. Tune embedding concurrency and request limits based on measured results.
6. **Data correctness:** test EN/FR, major-update flags, What's New scheduling, tenant isolation, CMS media, local fallback, `/chat` conversation continuity and retry semantics on the real EXE.
7. **Operations:** enforce least-privilege filesystem access, backups off-machine, restore drill, log rotation, alerting, resource monitoring, session cleanup and a staged deployment/rollback process.
8. **Provider privacy:** prompts and retrieved document chunks are transmitted to Groq. Confirm your contractual/privacy requirements with customers before public rollout.

The patch reduces several real risks without changing public API paths. It does **not** by itself certify that the service can safely handle external internet traffic or sustained production concurrency.
