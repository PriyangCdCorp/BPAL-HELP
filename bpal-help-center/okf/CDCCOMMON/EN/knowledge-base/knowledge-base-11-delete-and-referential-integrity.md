---
type: guide
title: Knowledge Base – 11. Delete and Referential Integrity
description: >-
  Knowledge Base: Delete is not displayed for read-only folder users. Covers:
  Delete; referential integrity constraints; Transactions are an explicit
  exception; never physically deleted; CANCELLED; REJECTED; Q: Why can't I
  delete this vendor?; A
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-12
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 11. Delete and Referential Integrity

**Delete** is not displayed for read-only folder users. It works directly from highlighted rows in the folder and does not open a notebook. It uses CDC Manager locking for the selected record keys, then asks the user to confirm deletion. Upon a successful physical database deletion, BPAL immediately removes the corresponding row from the folder container without Refresh.

BPAL's database uses **referential integrity constraints**. If another table references a row, the database refuses physical deletion, and BPAL displays an explanatory message. Example: a Vendor referenced by an existing Contract cannot be deleted while the reference remains. Multiple selected rows are handled individually: rows successfully deleted disappear, while a row whose deletion fails stays in the folder and triggers an error message. Locks are released when the operation completes.

**Transactions are an explicit exception**: a Transaction is **never physically deleted**. It may be marked **CANCELLED** or **REJECTED**, but remains in the database. The Transaction folder has no standard Delete toolbar button; designated actions exist inside its update notebook. Detailed Transaction workflows are reserved for later documentation.

**Q: Why can't I delete this vendor?**  
**A:** It may be referenced by a Contract or another related record. BPAL relies on database integrity checks and shows a message when deletion is disallowed. Review the message and existing references rather than attempting to force the delete.

**Q: I deleted three selected rows but only two disappeared.**  
**A:** BPAL processes selected deletions separately. Successful deletions disappear from the folder; any record that cannot be deleted, for example because another table references it, remains with an explanatory message.

## Related

- [Knowledge Base – 9. Open, Read Only, and CDC Manager Record Locks](./knowledge-base-9-open-read-only-and-cdc-manager-record-locks.md)
- [Knowledge Base – 10. New and Copy](./knowledge-base-10-new-and-copy.md)
- [Knowledge Base – 12. Export to CSV](./knowledge-base-12-export-to-csv.md)
- [Knowledge Base – 13. Folder Split Bar and Scrollbars](./knowledge-base-13-folder-split-bar-and-scrollbars.md)
