# Launching the BPAL Help Center with an Assistant question

This release extends the existing EXE; it does not replace or reinterpret the existing BPAL startup parameters (`-db:`, `-en`, `-fr`, `-coordinates:`, `-data:`, `-d:`, user ID, or query mode).

## New optional switch

Pass a question as **one quoted command-line argument**:

```cmd
"C:\Path\To\BPAL Help Center.exe" -db:CDCMSMTL -en --ask "What is BPAL?"
```

Also supported: `--ask="What is BPAL?"` and `--ask-question "What is BPAL?"`. No switch means the existing default startup behavior.

For an unpackaged development run:

```powershell
npm start -- --ask "What is BPAL?"
```

## When the window is already open

Run the EXE again with another question:

```cmd
"C:\Path\To\BPAL Help Center.exe" -db:CDCMSMTL -en --ask "How do I sort a folder?"
```

The single-instance lock routes the new question to the running window, focuses it, switches to the Assistant tab, and asks in the same conversation. **No new `conversation_id` is created by the EXE.** The existing window's database and user context remain in effect; new `-db:` or other context flags supplied to the second invocation are *not* applied to that running window. If a different database/user is required, close the existing window and relaunch it with that context.

Questions arriving while the chat is busy are queued in arrival order. Chat history remains in memory for the lifetime of the running application. A new session starts after closing/restarting the EXE, as before.

## Retry behavior

If the FastAPI `/chat` call fails (including HTTP 429/502/503/504, timeout or connection failure), the user question stays visible and the assistant bubble shows **Try again** (French: **Réessayer**). Clicking it sends **the same question** without adding another user bubble or intentionally resetting `conversation_id`. Failed responses are not added to conversation history. The endpoint may receive the question twice if the first request reached the backend but the response was lost, so this is a request retry, not an exactly-once network guarantee.

## Example C++ launcher

Your existing launcher can keep its original parameters; append only the optional switch and one properly Windows-quoted argument. Prefer `CreateProcessW` with `lpApplicationName` pointing at the EXE and a mutable command-line buffer. Example for a fixed, trusted question:

```cpp
std::wstring command = L"\"C:\\Program Files\\BPAL Help Center\\BPAL Help Center.exe\" -db:CDCMSMTL -en --ask \"What is BPAL?\"";
STARTUPINFOW si{}; si.cb = sizeof(si);
PROCESS_INFORMATION pi{};
std::vector<wchar_t> mutableCmd(command.begin(), command.end());
mutableCmd.push_back(L'\0');
BOOL ok = CreateProcessW(L"C:\\Program Files\\BPAL Help Center\\BPAL Help Center.exe",
    mutableCmd.data(), nullptr, nullptr, FALSE, 0, nullptr, nullptr, &si, &pi);
if (ok) { CloseHandle(pi.hThread); CloseHandle(pi.hProcess); }
```

For arbitrary question strings, use a correct Windows command-line argument quoting function (escape quotes and preceding backslashes); don't concatenate untrusted text naively.

## Local verification

1. Start your actual FastAPI backend and verify the customer key in the Windows Registry.
2. `npm install`, then `npm run test:launch` and `npm run test:api`.
3. `npm start -- --ask "What is BPAL?"`: the Assistant tab should open and ask the question.
4. With that same window still open, run `npm start -- --ask "How do I sort?"` in another terminal: it should activate the original window, not open a second one.
5. The backend should see `POST /chat` with the same `conversation_id` for the follow-up.
6. Stop FastAPI, ask a new question, verify Try again appears; restart FastAPI and click it. The question must appear only once in the chat UI.
7. Build on Windows using `npm run dist`, and repeat steps 3–6 on the **installed** EXE launched by your C++ application.

Automated tests cover parsing and existing API functionality. The real Windows GUI and packaged EXE behavior still require the local tests above.
