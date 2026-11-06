# BPAL Help Center — launch-question flag fix

## What was wrong

On some Windows second-instance launches, Electron injects Chromium switches such as
`--allow-file-access-from-files` into the command line. The original `--ask`
parser assumed the very next argv entry was the question, so it sometimes
submitted that Electron switch to FastAPI instead of the real question.

## Changes

- `launchQuestion.js`: skip injected switches, never submit a switch as a
  question, preserve BPAL startup arguments and support `--ask=...` syntax.
- `main.js`: preserve quoted legacy command-line values when parsing, and reuse
  sanitized startup arguments when initializing the Help Center.
- `JS/chat.js`: drain queued questions after an in-progress manually typed chat
  request finishes, keeping the existing FastAPI `conversation_id`.
- `tests/launchQuestion.test.js`: add regression tests for the Electron injected flag.

No FastAPI backend, Registry settings, or CMS changes are required.

## Important: close the OLD running Electron process FIRST

The first running instance owns the `second-instance` handler. Even if you
launch a newer copy, a still-running old instance will apply the OLD parser.
Close all BPAL Help Center windows and confirm no old Help Center Electron
process is still running before starting the new version for the first time.

The screenshot showed the old folder path `BPAL_Help_Center_FastAPI_Chat_CMS_Fixed`.
Make sure you run the updated directory, not that older copy.

## Run tests

In the extracted `BPAL-Help-Center` folder:

```powershell
npm install
npm run test:launch
npm run test:api
npm run test:cms
```

## Test startup and second launch

First terminal:

```powershell
npm start -- --ask "What is BPAL?"
```

Keep the window open. From a NEW terminal in the same project directory:

```powershell
npm start -- --ask "How do I sort a folder?"
```

Expected: the same Help Center window comes into focus, the Assistant tab
receives the NEW actual question, the previous messages remain, and FastAPI
uses the same session `conversation_id`. You should NEVER see a user bubble
containing `--allow-file-access-from-files`.

If you are launching the packaged EXE directly from C++ or CMD, use:

```cmd
"BPAL Help Center.exe" -db:CDCMSMTL -en --ask "What is BPAL?"
```

## Applying only the patch

Copy these updated files, preserving their relative paths:

- `launchQuestion.js`
- `main.js`
- `JS/chat.js`
- `tests/launchQuestion.test.js` (optional but recommended)

No change is needed to `.env`, the Windows Registry, the FastAPI backend, or
the Admin Portal. Do not copy any API keys into the Electron source.

## Verification caveat

Node syntax checks and automated tests were run in this environment. The
Windows Electron GUI and packaged installer were not run here; test both
initial and second launches on your Windows PC before distributing.
