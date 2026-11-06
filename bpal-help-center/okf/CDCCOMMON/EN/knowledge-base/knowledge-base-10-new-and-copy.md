---
type: guide
title: Knowledge Base – 10. New and Copy
description: >-
  Knowledge Base: New and Copy are not shown in folders where the user has
  read-only authority. Covers: New; Copy; Add; at the end of the current folder
  container; highlights it; including its primary key; Q: Why did the new
  product appear at the bottom rather than in sorted order?; A
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-11
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 10. New and Copy

**New** and **Copy** are not shown in folders where the user has read-only authority. **New** opens an empty folder-specific notebook in New mode for entering the record's data. Individual field validation and editing rules are notebook-specific and are not defined by this common reference.

After a successful **Add**, BPAL appends the new row **at the end of the current folder container** and **highlights it**. This deliberate behaviour makes it easy to open and correct the new row, even if it does not meet the folder's current Selection Criteria. No automatic folder Refresh or immediate resort occurs. On the next Refresh the row appears only if it matches the active Selection Criteria and, if present, falls into the normal sort order.

**Copy** requires a highlighted source row and opens a notebook in New mode, prefilled with the source record's data **including its primary key**. The user changes the fields that differ and must change the primary key to a unique value; otherwise BPAL reports the record already exists. A successfully added Copy behaves like New: append and highlight.

**Q: Why did the new product appear at the bottom rather than in sorted order?**  
**A:** BPAL deliberately appends and highlights newly added records so users can find them immediately. The next Refresh applies the normal selection and sorting rules.

## Related

- [Knowledge Base – 8. Find: Direct Record Lookup](./knowledge-base-8-find-direct-record-lookup.md)
- [Knowledge Base – 9. Open, Read Only, and CDC Manager Record Locks](./knowledge-base-9-open-read-only-and-cdc-manager-record-locks.md)
- [Knowledge Base – 11. Delete and Referential Integrity](./knowledge-base-11-delete-and-referential-integrity.md)
- [Knowledge Base – 12. Export to CSV](./knowledge-base-12-export-to-csv.md)
