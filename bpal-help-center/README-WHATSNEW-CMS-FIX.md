# What’s New — API-first fixes

This release is based on BPAL_Help_Center_Registry_Config_Fixed.zip.

## Four modified files
- main.js — successful CMS responses take precedence even if empty; fallback only for failed/missing API responses; source diagnostic logging.
- cmsHelpContent.js — maps visible_from/to, major_update (and legacy camelCase alias); inclusive date filtering, newest-first sorting, source selection test helper.
- JS/tips.js — visible Major update badge, highlighting, and safe version string rendering.
- CSS/tips.css — major release styling.
- tests/cmsHelpContent.test.js — tests for empty-result authority and visibility/major behavior.

## Install
For a minimally invasive update, copy the four source files into the existing Electron project (preserve other files, configuration and Registry data). Run `npm run test:cms` and `npm start`. Build with `npm run dist` only after GUI validation.

## Diagnostics
The console now prints:
`[CMS] Sources: { tips: 'cms'|'local', whatsNew: 'cms'|'local' } API What's New entries: N Visible What's New entries: N Images: N`
- `whatsNew: 'cms'` and 0 entries = server responded successfully with no applicable published releases.
- `whatsNew: 'local'` = CMS request failed or configuration missing. See preceding `[CMS] What's New unavailable` warning and confirm `/content/whats-new` is exposed by the running FastAPI instance.
- 404 indicates route/server mismatch, NOT an empty successful list.

## Visibility and release metadata
`visible_from` / `visible_to` are converted to `YYYY-MM-DD` and the Help Center compares those dates inclusively. Major releases use `major_update` stored in the translated article content. When an article is published, the server must include the current customer, language, and translation in `GET /content/whats-new?language=en|fr`. The API also filters publication/status/tenant/visibility and can exclude releases before Electron receives them.

**Important caveat**: If the CMS backend interprets `visible_to` as an exact timestamp, an end time at 00:00 can exclude the rest of the final day on the server. If you intend whole-day visibility, set the end time to 23:59:59 local time (and check how the portal converts timezones). Electron cannot restore releases that the API itself has filtered out. Fix this semantic mismatch on the backend or portal once deployment's timezone rule is agreed.

This patch has been tested with Node unit tests, not a live Windows Electron app.
