# Missing API key: support popup

Change: `main.js` now checks the resolved customer API key before creating the main window. When Registry and `.env` provide no valid customer API key (or only a placeholder), it displays a warning dialog: **The Help Center is not configured. Please contact support.** It then exits. No credentials or Registry paths are shown.

The check does not make a network request. A configured key with a failed server connection is handled by the existing API error handling. Registry has priority over `.env` as before.

## Local test
1. Back up your current Registry API key securely. Do not paste it in chats or terminal logs.
2. Remove the key temporarily in your test environment (and remove any `.env` fallback key), then `npm start`. You should see one warning and the app should exit.
3. Restore the key and run `npm start` again. The window should open normally.

For production builds, run `npm run dist` on Windows.
