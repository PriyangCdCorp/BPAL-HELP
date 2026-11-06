---
type: guide
title: Knowledge Base – 5. Column Selection (Columns)
description: >-
  Knowledge Base: The Columns dialog has List All on the left (all available
  folder columns) and Select All on the right (the displayed columns, in their
  chosen left-to-right order). Covers: Columns; List All; Select All; Add
  (`>>`); Remove (`<<`); Move Up; Move Down; not
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-6
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 5. Column Selection (Columns)

The **Columns** dialog has **List All** on the left (all available folder columns) and **Select All** on the right (the displayed columns, in their chosen left-to-right order). Select a column and **Add (`>>`)** or **Remove (`<<`)** it; use **Move Up** and **Move Down** to change display order. The user can select several columns on the left to add all of them. Changing visible columns does **not** query the database: BPAL already fetched all defined columns into the container.

**OK** applies changes immediately without saving them. Named layouts, User id, Save As, Default, Save and Delete work like those for Selection Criteria, including using another user's saved layout and saving a personal copy. **Reset all** clears the right-side list; unlike Selection Criteria, an empty selected-column list is invalid and clicking OK displays an error requiring **at least one column**.

Available-column dropdown/list ordering can use the CDCorp-defined logical order or alphanumeric order. A global setting establishes a preference; an individual folder's **Options** menu can override it. This is ordering of **available column names in selection interfaces**, not the displayed folder's data rows.

**Q: Can I show a hidden column without refreshing?**  
**A:** Yes. Click **Columns**, move the desired column from the left list to the right, adjust its position and click **OK**. BPAL displays it from the data already loaded.

## Related

- [Knowledge Base – 3. Standard Folder: Opening, Auto Ref, Refresh and Stop](./knowledge-base-3-standard-folder-opening-auto-ref-refresh-an.md)
- [Knowledge Base – 4. Database Selection Criteria (Select)](./knowledge-base-4-database-selection-criteria-select.md)
- [Knowledge Base – 6. Folder Sort Criteria (Sort)](./knowledge-base-6-folder-sort-criteria-sort.md)
- [Knowledge Base – 7. Folder Profiles](./knowledge-base-7-folder-profiles.md)
