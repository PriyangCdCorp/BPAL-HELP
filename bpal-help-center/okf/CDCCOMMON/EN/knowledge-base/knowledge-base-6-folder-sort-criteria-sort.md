---
type: guide
title: Knowledge Base – 6. Folder Sort Criteria (Sort)
description: >-
  Knowledge Base: The Sort dialog lists available columns on the left and chosen
  sort keys, in priority order, on the right. Covers: Sort; Ascending;
  Descending; Toggle Sort; Remove; Move Up/Down; Category [ASC]; Product Code
  [ASC]
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-7
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 6. Folder Sort Criteria (Sort)

The **Sort** dialog lists available columns on the left and chosen sort keys, in priority order, on the right. Choose **Ascending** or **Descending** to add a key, **Toggle Sort** to reverse an existing key, **Remove** to remove one, and **Move Up/Down** to change priority. Example: **Category [ASC]**, then **Product Code [ASC]** sorts first by Category and within category by Product Code.

BPAL intentionally does **not** send an `ORDER BY` for folder fetches. Sorting is performed by the local folder container **after record fetching finishes**, whether the fetch completed normally or was interrupted via Stop. Changing Sort later reorders rows already in the folder without another SQL query.

Sort has the same named configurations, User id, Default, Save, Delete, OK and Cancel principles as Selection Criteria and Columns. **Reset all followed by OK** applies no explicit sort. Without a sort configuration, users should not assume the database's natural retrieval order is stable.

**Q: Why are the rows sorted even though I pressed Stop?**  
**A:** BPAL sorts the rows that were successfully fetched after retrieval ends, including when the user interrupts the fetch. The folder may be incomplete but the rows that are present are sorted.

## Related

- [Knowledge Base – 4. Database Selection Criteria (Select)](./knowledge-base-4-database-selection-criteria-select.md)
- [Knowledge Base – 5. Column Selection (Columns)](./knowledge-base-5-column-selection-columns.md)
- [Knowledge Base – 7. Folder Profiles](./knowledge-base-7-folder-profiles.md)
- [Knowledge Base – 8. Find: Direct Record Lookup](./knowledge-base-8-find-direct-record-lookup.md)
