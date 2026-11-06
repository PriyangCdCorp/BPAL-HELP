# Multi-tenant RAG API (SQLite + local BGE-M3 + Groq)

A single shared SQLite database serves multiple clients. Each client can access **only `POST /chat`** using its own API key. Document and client administration routes require a separate administrator secret.

## Architecture
- Local CPU BGE-M3 embeddings (`BAAI/bge-m3`); no online embedding API.
- NumPy cosine similarity over locally stored vectors.
- Groq `openai/gpt-oss-120b` for answer generation and follow-up query rewriting.
- Shared SQLite database with tenant IDs on documents and conversations.
- API keys are stored as SHA-256 hashes; plaintext client keys are returned once.
- English/French greetings are handled locally.
- Customer-facing answers omit `[S1]` markers. The response still includes source metadata in `sources` for application-side use.
- Unsupported questions receive a fixed support response.

## Important privacy note
BGE-M3 embeddings and vector retrieval run locally. Questions and retrieved passages are sent to Groq for answer generation. Review your client data obligations before enabling cloud LLM processing.

## Setup (Windows PowerShell)
1. Create and activate your Python virtual environment.
2. Install dependencies: `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env`.
4. Set `ADMIN_API_KEY` to a long random secret and set `GROQ_API_KEY`.
5. Start: `uvicorn app.main:app --host 127.0.0.1 --port 8000`.
6. The first BGE-M3 run downloads the model once; later runs use its local cache.

## Administrator workflow
Use the `X-Admin-Key` header for every `/admin/*` route.

1. `POST /admin/clients` with form field `name` creates a client and returns its API key once.
2. Save the API key securely and provide it to that client.
3. Upload each client's files using `POST /admin/documents/upload`, with form fields `tenant_id` and `file`.
4. List a client's files with `GET /admin/documents?tenant_id=<tenant-id>`.
5. Delete a file with `DELETE /admin/documents/{document_id}`.
6. List client IDs/names with `GET /admin/clients`.

Do not give clients the administrator key. Keep administrative routes on localhost or behind a trusted private network/VPN. Do not expose an unauthenticated admin interface to the public internet.

## Client workflow
Only the chat endpoint is intended for client applications:

```http
POST /chat
Authorization: Bearer CLIENT_API_KEY
Content-Type: application/json
```

New conversation:
```json
{"question": "What does the service do?"}
```

Follow-up (reuse the returned conversation ID):
```json
{"conversation_id": "RETURNED-CONVERSATION-ID", "question": "Can you explain that further?"}
```

A conversation ID is scoped to the authenticated client. A different client cannot resume it, even if it knows the ID. Tenant identity is derived from the validated API key; clients cannot select another tenant in the request body.

## Existing database migration
On startup, the app adds `tenant_id` columns to existing documents and conversations. Existing records are assigned `__unassigned__` and are deliberately invisible to newly created clients. Re-upload existing knowledge through the administrator endpoint for each intended client. Existing uploaded files may still be in `storage/uploads`; the SQLite rows and vectors are what power retrieval.

## API routes
- Client: `POST /chat`
- Operational: `GET /`, `GET /health`
- Admin only: `/admin/clients`, `/admin/documents/*`

For production, use HTTPS, rotate/revoke keys when necessary, back up SQLite, and run behind a reverse proxy with rate limits. Keep `/docs` and `/openapi.json` private or disabled in production if clients should not discover admin route names.

## CMS (Tips & Tricks and What's New)
The CMS is added to the existing FastAPI service; it does not replace the RAG/chat routes.
CMS tables are created automatically at startup and are additive to the existing SQLite schema.

### CMS administrator endpoints
All `/admin/cms/*` endpoints currently use the existing `X-Admin-Key` administrator secret.
This is an initial protected API for development; before exposing a browser Admin Portal to a wider
network, replace the shared key workflow with individual administrator accounts, secure password
hashing, role-based permissions, CSRF protections where cookie sessions are used, and MFA.

- `POST /admin/cms/content` create a draft
- `GET /admin/cms/content` list/filter content
- `GET /admin/cms/content/{id}` retrieve content and translations
- `PUT /admin/cms/content/{id}` update a draft (editing a published item returns it to draft)
- `POST /admin/cms/content/{id}/publish` publish and create a version snapshot
- `POST /admin/cms/content/{id}/archive` archive
- `GET /admin/cms/content/{id}/versions` list published snapshots
- `POST /admin/cms/media` upload PNG/JPEG/WEBP/GIF media
- `POST /admin/cms/content/{id}/media/{media_id}` attach media to content
- `GET /admin/cms/audit-logs` read the CMS audit log

Create payload example:
```json
{
  "content_type": "TIP",
  "scope": "GLOBAL",
  "category": "Getting Started",
  "translations": {
    "en": {"title": "Create a folder", "body": {"steps": ["Open BPAL", "Select New Folder"]}},
    "fr": {"title": "Créer un dossier", "body": {"steps": ["Ouvrir BPAL"]}}
  }
}
```
`content_type` is `TIP` or `WHATS_NEW`; `scope` is `GLOBAL`, `TENANT`, or `INTERNAL`.
A `TENANT` item requires a valid active `tenant_id`. `INTERNAL` items are never returned to client content endpoints.

### Employee/client endpoints
These require `Authorization: Bearer <client-api-key>`. Tenant identity is derived from the API key.
- `GET /content/tips?language=en|fr`
- `GET /content/whats-new?language=en|fr`
- `GET /content/media/{media_id}` (only media attached to published content visible to that tenant)

The employee endpoints return only published GLOBAL content and published content for the authenticated tenant.
The requested language falls back to the other available translation if it is missing.
Content body is structured JSON, allowing the Electron renderer to map it to its existing `mainHeadings`,
`subHeadings`, `steps`, and What's New view models. The CMS does not yet modify the Electron renderer; that is a separate integration step.

### CMS test coverage
`tests/test_cms.py` covers draft creation, publishing, English/French translation selection, tenant isolation,
global content visibility, version snapshots, and rejection of invalid client API keys.
Run all tests with `PYTHONPATH=. pytest -q` from the backend project directory.

## Milestone 2: individual CMS administrators and Admin Portal

The CMS now has individual administrator accounts, password hashing, and opaque server-side bearer sessions. CMS sessions expire after 8 hours; logout revokes the current session. Roles:
- `ADMIN`: full CMS access.
- `EDITOR`: create, edit, publish and manage CMS content.
- `VIEWER`: read-only access to CMS administration endpoints.

The old shared `X-Admin-Key` remains in use for legacy `/admin/clients` and `/admin/documents/*` endpoints. The CMS browser portal does not use that shared key.

### Create the first administrator
Run from the `backend` directory after installing requirements:

```powershell
python scripts/create_admin.py
```

The script prompts for email, display name, password and role. Use a unique password of at least 12 characters. Administrator accounts are stored in the same SQLite database. Run the script again to add another administrator; the email address must be unique.

### Run the Admin Portal
Install Node.js 20+ and npm. In a terminal:

```powershell
cd admin-portal
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The portal calls the FastAPI service at `http://127.0.0.1:8000` by default. To use another API address, set `VITE_API_BASE_URL` before starting Vite. The backend allows local Vite origins on port 5173 for development only.

For a production deployment, serve the built portal over HTTPS, configure an explicit trusted CORS origin, add rate limiting and monitoring, and review session/token storage and XSS protections. Do not expose the development Vite server to the public internet.

### CMS administration API authentication
1. `POST /admin-auth/login` with `{ "email": "...", "password": "..." }` returns an opaque bearer token.
2. Send `Authorization: Bearer <access_token>` to `/admin-auth/me` and `/admin/cms/*`.
3. `POST /admin-auth/logout` revokes that session.
4. `GET /admin/cms/tenants` lists active customer tenants for the content editor.

### Media and editor notes
The portal uses Quill for rich-text HTML authoring and supports PNG, JPEG, WEBP and GIF uploads. Uploads are attached to a content item and served to authenticated employees only when attached to published content visible to their tenant. The current portal milestone attaches media to the item; inline media placement inside the rich-text body and a full media-library browser are follow-up refinements.

### Regression tests
From `backend`:

```powershell
$env:PYTHONPATH = "."
pytest -q
```

The current automated backend suite covers the existing chat tests, CMS publication/translation/tenant visibility, and administrator login/roles/session revocation. The Admin Portal JavaScript dependencies must be installed locally before running `npm run build`.

### Credential hygiene
Never put live API keys or passwords in `.env.example`, source control or ZIP files. The supplied Milestone 1 archive included credential-looking values in `.env.example`; this updated archive replaces them with placeholders. Treat any real values from that file as exposed: rotate the affected customer API keys and the legacy administrator secret, then update the installed Electron/client configuration and your local `.env`. The new `POST /admin/clients/{tenant_id}/rotate-key` endpoint (protected by the legacy administrator key) issues a replacement customer key once and invalidates the previous key. Do not paste the replacement keys into chat.
