BPAL CMS Text-First Performance Patch

Source: combines the previously shared Electron Performance Patch and CMS Fast Render Patch.

Close Electron. Copy these files into your CURRENT working Electron project:
  main.js
  cmsHelpContent.js
  JS/tips.js

Main change: CMS item text is returned immediately after the authenticated /content/tips and /content/whats-new requests and local cache lookup. Download of absent images no longer holds up both tabs. When image downloads complete, the main process sends cms-media-ready, and the renderer refreshes with locally cached authenticated images.

Also preserves CMS-only mode, shared concurrent CMS requests, and read-only HTML rendering from earlier patches.

After replacing, run:
  node --check .\main.js
  node --check .\cmsHelpContent.js
  node --check .\JS\tips.js
  npm start

Use Electron DevTools -> Console for [PERFORMANCE] CMS data received and CMS synchronous render.
First load may show text before images, by design.

IMPORTANT: built against the previously provided code, not your unseen latest local edits. Compare before replacing, and keep a copy of your working files. No server changes required. Tested: 24 existing Node tests passed, JavaScript syntax checks passed. Actual Electron UI behavior must be verified on your Windows computer.
