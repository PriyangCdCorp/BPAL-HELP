---
type: guide
title: 'Knowledge Base – 9. Open, Read Only, and CDC Manager Record Locks'
description: >-
  Knowledge Base: The folder establishes a user's read-only or update authority
  when initialized. Covers: read-only; update; Open; Open toolbar button;
  record-level lock; name, phone, email, lock date/time, and elapsed lock
  duration; Right-clicking the OPEN TOOLBAR BUTTON; Open in Read Only Mode
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-10
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 9. Open, Read Only, and CDC Manager Record Locks

The folder establishes a user's **read-only** or **update** authority when initialized. Pressing **Open** requires at least one highlighted row; BPAL displays an error if none is selected. For each selected row, it reads the primary key and fetches that record afresh from the database for its notebook.

For read-only authority, the notebook is opened read-only without a CDC Manager update lock. For update authority, the **Open toolbar button** attempts to open in update mode: BPAL first requests a CDC Manager **record-level lock** keyed by the record's primary key. If granted, it fetches the record and opens its notebook in update mode. The lock stays held throughout the update notebook session, even if no changes are made, and is released when that notebook closes.

When another user already holds the update lock, BPAL displays the lock holder's **name, phone, email, lock date/time, and elapsed lock duration**. The user is offered the choice to open the row in read-only mode instead. A failed lock on one of several selected rows affects that row only; other selected rows are processed.

**Right-clicking the OPEN TOOLBAR BUTTON** shows its one extra option: **Open in Read Only Mode**. This retrieves the record without requesting a CDC Manager lock, even when the user has update rights. A right-click on a **folder row** is a different context-menu operation.

Read-only users may view the same record while another user has it open for update. But a read-only notebook is a snapshot of values fetched when opened, **not real-time synchronized**. To see later saved updates, **close and reopen the notebook**. A Refresh inside the open notebook does not exist. User experience indicates simultaneous competing updates and requests for notebook-refresh functionality have been uncommon; notebook refresh is not an established customer requirement.

**Q: BPAL says another user has the record locked. What can I do?**  
**A:** Read the popup to identify the user and how long the lock has been held. You may choose **Read Only** to view the record without changing it, or contact the lock holder to close their update notebook. Do not attempt to bypass the lock.

**Q: Why can't I see a colleague's changes in the record I already have open?**  
**A:** An open read-only notebook does not automatically reload its data. Close it and reopen it to fetch current database values.

## Related

- [Knowledge Base – 7. Folder Profiles](./knowledge-base-7-folder-profiles.md)
- [Knowledge Base – 8. Find: Direct Record Lookup](./knowledge-base-8-find-direct-record-lookup.md)
- [Knowledge Base – 10. New and Copy](./knowledge-base-10-new-and-copy.md)
- [Knowledge Base – 11. Delete and Referential Integrity](./knowledge-base-11-delete-and-referential-integrity.md)
