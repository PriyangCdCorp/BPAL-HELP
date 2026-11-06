---
type: guide
title: 'Knowledge Base – 14. Standard Notebook: Navigation, Save and Lookup'
description: >-
  Knowledge Base: 14.1 Navigation buttons and unsaved changes Notebook controls
  First, Previous, Next, Last navigate through rows in the underlying folder
  without closing the notebook. Covers: 14.1 Navigation buttons and unsaved
  changes; First; Previous; Next; Last; Data has been changed. Do you wa...
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-15
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 14. Standard Notebook: Navigation, Save and Lookup

**14.1 Navigation buttons and unsaved changes**

Notebook controls **First**, **Previous**, **Next**, **Last** navigate through rows in the underlying folder without closing the notebook. Each navigation changes the highlighted folder row and the notebook's displayed record. At the first row, First and Previous are disabled; analogous boundary controls are disabled at the last row.

If unsaved data edits exist and a user attempts to navigate, BPAL asks: **Data has been changed. Do you want to apply the changes before scrolling?** **Yes** saves then navigates; **No** discards unsaved edits then navigates; **Cancel** remains on the current record. If changes are discarded, navigating back shows original database values, not discarded edits.

**14.2 OK, Cancel, X, Apply**

- **OK**: If data was changed, save the edits to the database and create the corresponding audit; then close the notebook.
- **Cancel** and window **X**: Close the notebook, but if unsaved changes exist, ask whether to save before closing, with Yes/No/Cancel choices. This protects against accidental loss.
- **Apply**: Enabled only when BPAL detects unsaved changes. Saves changes to the database and the audit while **keeping the notebook open** and, for a record opened in update mode, **retaining its CDC Manager lock**. Following a successful Apply, Apply becomes disabled until further edits are made. Previously applied edits are already saved even if later unsaved edits are discarded.

Field-level notebook rules, validations, and the exact behavior of every business-specific tab must be separately documented for the applicable notebook type.

**14.3 Notebook magnifying glass and Info icon**

A **magnifying glass** beside a notebook code field signals a code that references a lookup table. Clicking it opens a **review folder** for the referenced table; example: Product notebook → Product Type code → Product Type folder. This review folder can expose standard folder functions, such as New, Open, Delete, Copy, Columns and Sort, subject to user authority. Users may select the code from the review folder or type a known code directly. If a typed code does not exist in the referenced table, BPAL rejects it with a validation message. An adjacent circled **i** means **Info** and a nearby description may display the referenced code's meaning; detailed Info-button action remains to be confirmed.

**Q: What does the magnifying glass beside Product Type do?**  
**A:** It opens a review folder showing valid Product Types. You can choose one there, or enter a code directly if you know it. An invalid code is rejected because Product Type is validated against its underlying table.

## Related

- [Knowledge Base – 12. Export to CSV](./knowledge-base-12-export-to-csv.md)
- [Knowledge Base – 13. Folder Split Bar and Scrollbars](./knowledge-base-13-folder-split-bar-and-scrollbars.md)
- [Knowledge Base – 15. Mini Containers Inside Notebooks](./knowledge-base-15-mini-containers-inside-notebooks.md)
- [Knowledge Base – 16. Messages: Record-linked Operational Communications](./knowledge-base-16-messages-record-linked-operational-communi.md)
