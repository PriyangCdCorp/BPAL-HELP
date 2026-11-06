---
type: guide
title: Knowledge Base – 12. Export to CSV
description: >-
  Knowledge Base: Export writes all rows currently loaded in the folder, not
  just highlighted rows, and only columns currently visible through Columns.
  Covers: Export; all rows currently loaded; only columns currently visible;
  Export to File; last export directory per user; Export to CSV (Excel); I...
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-13
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 12. Export to CSV

**Export** writes **all rows currently loaded** in the folder, not just highlighted rows, and **only columns currently visible** through Columns. It preserves left-to-right column order, row sort order and displayed/formatted values exactly as the user sees them (including descriptions and formatted dates). If Refresh was stopped partway through, only that partial set is exported.

The **Export to File** dialog proposes a filename and directory. BPAL remembers the **last export directory per user**. File Type is **Export to CSV (Excel)**. **Include column header** is selected by default each time; uncheck it if you want data-only CSV. Click **Create** to generate the file. BPAL launches the operating system's default program associated with `.csv` files (often Excel) to display it.

**Q: Can I export only certain fields?**  
**A:** Yes. First use **Columns** to show only the fields you want, in the order you want. Then click **Export**. BPAL exports the visible columns and all rows in the folder.

## Related

- [Knowledge Base – 10. New and Copy](./knowledge-base-10-new-and-copy.md)
- [Knowledge Base – 11. Delete and Referential Integrity](./knowledge-base-11-delete-and-referential-integrity.md)
- [Knowledge Base – 13. Folder Split Bar and Scrollbars](./knowledge-base-13-folder-split-bar-and-scrollbars.md)
- [Knowledge Base – 14. Standard Notebook: Navigation, Save and Lookup](./knowledge-base-14-standard-notebook-navigation-save-and-look.md)
