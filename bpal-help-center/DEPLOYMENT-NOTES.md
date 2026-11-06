# BPAL Help Center — public CMS integration

## Changes

- `cmsHelpContent.js` now derives the API origin from the configured URL.
  A Registry value ending in `/chat` loads `GET /content/tips`,
  `GET /content/whats-new`, and `GET /content/media/{media_id}` correctly.
- All three CMS requests send the existing customer bearer token.
- Original local-file fallback is preserved. The Assistant `/chat` logic is unchanged.

## Required backend / Caddy configuration (not included in this ZIP)

This ZIP contains the Electron client, **not** the FastAPI backend or Caddy configuration.
The server currently exposes only `GET /health` and `POST /chat`. The CMS tabs
will still get HTTP 404 until the following are verified and exposed:

1. Confirm FastAPI requires a valid customer bearer key on `GET /content/tips`,
   `GET /content/whats-new`, and `GET /content/media/{media_id}`; verify tenant
   isolation and only published/visible content. Test each unauthenticated with
   the LOCAL backend and expect 401/403, before forwarding from the Internet.
2. Only after authentication is confirmed, allow **GET** on those three routes
   through Caddy, while denying all other methods and CMS/admin endpoints.
3. With a valid customer key, confirm both languages and media loading.
   Without a key, verify 401/403 (not 200). Admin URLs must remain 404.

Example public Caddy matcher additions, inside the existing hostname block:

```caddyfile
@contentLists {
    method GET
    path /content/tips /content/whats-new
}
@contentMedia {
    method GET
    path /content/media/*
}
handle @contentLists {
    reverse_proxy 127.0.0.1:8000
}
handle @contentMedia {
    reverse_proxy 127.0.0.1:8000
}
```

This is a **fragment**, not an entire replacement Caddyfile. Include before
the existing final `handle { respond "Not Found" 404 }`.
Do not activate unless FastAPI authentication/authorization is verified.

## Important: incomplete uploaded project

The uploaded archive does not contain `registryHelper.js`, `retrieval.js`, or
`tokenBudget.js`, although the existing `main.js`, `okfKnowledgeBase.js`, and
`llmService.js` depend on them. `npm start` or `npm run dist` will fail until
those original files are restored. No substitute implementations have been
invented, because they contain critical registry and legacy compatibility logic.

## Test (Windows or Node 22+)

```powershell
npm ci
npm run test:cms
npm run test:api
npm run check:api
npm start
```

`check:api` validates chat and health, not content endpoints.

## Cleanup

Removed outdated one-off README files and zero-byte placeholder text files.
Preserved `documents/`, `okf/`, all scripts, legacy modules, assets and tests
because the app or its developer workflows may still rely on them.
