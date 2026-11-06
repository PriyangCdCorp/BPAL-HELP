---
type: guide
title: 'Knowledge Base – 3. Standard Folder: Opening, Auto Ref, Refresh and Stop'
description: >-
  Knowledge Base: 3.1 Auto Ref Auto Ref is a persistent on/off toggle for
  initial retrieval. Covers: 3.1 Auto Ref; Auto Ref is a persistent on/off
  toggle for initial retrieval.; 3.2 Manual Refresh lifecycle; One moment
  please; Stop; 3.3 Stop and partial results; does not restore the old rows;
  does ...
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-4
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 3. Standard Folder: Opening, Auto Ref, Refresh and Stop

**3.1 Auto Ref**

**Auto Ref is a persistent on/off toggle for initial retrieval.** When enabled, opening a folder automatically runs the applicable default Selection Criteria and retrieves data. When disabled, the folder opens initially empty until the user explicitly invokes Refresh or applies Selection Criteria/Profile. Auto Ref is not periodic refresh. Its setting is maintained per user and per folder, including Mini Containers.

If a default Profile exists, its referenced Selection Criteria takes precedence over an individual saved default selection. If a selected Profile leaves a component unspecified, the currently active setting for that component remains in effect.

**3.2 Manual Refresh lifecycle**

1. BPAL clears every currently displayed row from the container.
2. It executes an SQL `COUNT` using the active Selection Criteria to establish the number of matching records. During this phase the status bar displays **One moment please**.
3. BPAL executes its SQL data-fetch operation and progressively adds matching records to the folder.
4. During retrieval, the Refresh button becomes **Stop**, and the status bar reports loaded rows, total from COUNT, percentage and elapsed time, for example `234 of 1586 (14%) (1.487 seconds)`.
5. After fetching ends, either normally or following Stop, BPAL applies the configured container sort to the rows loaded. The toolbar button returns to Refresh.

The displayed elapsed time covers the overall refresh operation, including COUNT. The current final status, for example `206 rows displayed (1.461 seconds)`, does not identify whether retrieval finished normally or was interrupted.

**3.3 Stop and partial results**

Pressing **Stop** while records are being fetched halts further retrieval, but **does not restore the old rows** and **does not remove newly fetched rows**. The partially loaded results remain displayed and are sorted when fetching terminates. Stop may also take effect in the interval after COUNT and before fetch starts. The initial SQL COUNT itself currently cannot be cancelled by the Stop button; users may have to wait for it to finish.

**Important:** An interrupted folder may display only some of the records matching the active Selection Criteria. A status of `0 rows displayed` alone does not prove that there are zero database matches.

**3.4 Answer example**

**Q: My folder is empty when I open it. Is it broken?**  
**A:** Check whether **Auto Ref** is enabled. When Auto Ref is off, a folder opens without fetching records. Click **Refresh** to retrieve records using the active Selection Criteria, or use **Select** to choose a different selection. If the folder still shows zero rows, check the criteria before concluding that no matching records exist.

**Q: I pressed Stop and now my folder shows fewer rows.**  
**A:** Stop halts the fetch and leaves the records retrieved up to that moment. The prior rows were cleared at the start of Refresh. Click **Refresh** again to rerun a complete retrieval, or narrow your Selection Criteria if the folder is large.

## Related

- [Knowledge Base – 1. Instructions for the BPAL AI Assistant](./knowledge-base-1-instructions-for-the-bpal-ai-assistant.md)
- [Knowledge Base – 2. What BPAL Is and How Its Records Are Organized](./knowledge-base-2-what-bpal-is-and-how-its-records-are-organi.md)
- [Knowledge Base – 4. Database Selection Criteria (Select)](./knowledge-base-4-database-selection-criteria-select.md)
- [Knowledge Base – 5. Column Selection (Columns)](./knowledge-base-5-column-selection-columns.md)
