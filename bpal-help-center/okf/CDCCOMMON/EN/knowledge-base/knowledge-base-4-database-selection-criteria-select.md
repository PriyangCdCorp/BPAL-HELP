---
type: guide
title: Knowledge Base – 4. Database Selection Criteria (Select)
description: >-
  Knowledge Base: 4.1 Purpose, limits and operators Click Select to configure
  which records BPAL retrieves from the database. Covers: 4.1 Purpose, limits
  and operators; Select; up to 10 conditions; Column; Operator; Value; AND; The
  selected operator does not apply to numeric values!
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-5
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 4. Database Selection Criteria (Select)

**4.1 Purpose, limits and operators**

Click **Select** to configure which records BPAL retrieves from the database. Standard folders allow **up to 10 conditions**, one per row. Each condition has **Column**, **Operator**, and **Value**. The Column dropdown contains every column defined for that folder; the column-name list may be in CDCorp-configured logical order or user-selected alphanumeric order. Filled condition rows are joined with logical **AND**.

The common Operator list includes: `=`, `<>`, `<`, `>`, `<=`, `>=`, `STARTING WITH`, `NOT STARTING WITH`, `CONTAINING`, `NOT CONTAINING`, `RANGE`, `IS NULL`, and `IS NOT NULL`. The same list is presented for all column types; BPAL rejects incompatible combinations, for example `STARTING WITH` on a numeric Material Id, displaying **The selected operator does not apply to numeric values!** Blank operator entries correspond to rows without a chosen column.

For `=`, comma-separated values represent alternatives for the same condition, such as `Status = A, I`. The **RANGE** operator expects exactly two comma-separated endpoints and includes both boundaries. Example: `Material Id RANGE 1000, 2000` includes 1000 and 2000. With separate conditions `Status = A` and `Product Description CONTAINING OVER`, a record must satisfy **both**.

**4.2 Values and lookups**

Users can type values manually into the Value field, including multiple comma-separated codes. If BPAL recognizes a flag-value list or an associated lookup table, the magnifying-glass icon activates to offer selectable values. Example: Status presents `A - Active` and `I - Inactive` with checkboxes. Selecting both yields a comma-separated value such as `A, I`. Lookups are optional for users who know the codes.

For date fields, the lookup control becomes a **calendar icon**, which opens the BPAL Calendar dialog.

**4.3 Date selection and dynamic expressions**

The Calendar shows three months and supports month/year navigation. Its Date type choices are **Specific**, **Today**, and Sunday through Saturday. **Specific** returns a fixed date formatted `YYYY-MM-DD`. **Today** with a Days offset returns a dynamic expression such as `TODAY-7`, evaluated as seven calendar days before the current day when the selection is used.

When a weekday is selected, **Days** becomes **Weeks**. BPAL defines each week as **Sunday through Saturday**. Blank or zero selects that weekday in the current calendar week, even if the day is still in the future; `-1` selects that weekday in the previous calendar week. For Monday 19 October 2026, `SUNDAY` = 18 October, `SATURDAY` = 24 October, `SUNDAY-1` = 11 October and `SATURDAY-1` = 17 October. BPAL returns the expression rather than the calculated date, making it reusable in saved selections.

Relative expressions can be used with **RANGE**. Example: `SUNDAY-1, SATURDAY-1` specifies the entire previous Sunday-to-Saturday week, inclusive.

**4.4 Named selections, defaults and buttons**

- **User id**: Switch to another user's named saved Selection Criteria for that folder. This helps two users obtain comparable results. Saving a change stores it under the **current** user's ID rather than overwriting the other user's copy.
- **Save As**: Choose an existing saved selection or name a new one.
- **Default**: Only one saved selection per user per folder may be default; choose the saved selection, check Default and press Save to replace the previous default.
- **Save**: Persist a named selection; not required to test a change.
- **OK**: Apply the conditions currently shown and **immediately Refresh** the folder, whether saved or not.
- **Cancel**: Close the dialog without applying or saving unsaved edits; leave the folder unchanged.
- **Reset all**: Clear all ten conditions. Following Reset all with OK retrieves **all records** in a standard folder.
- **Delete**: Remove the chosen named saved selection for that folder.

Users may save an entirely empty selection, such as `All`, and even make it their default. With Auto Ref enabled, that can cause all folder rows to be retrieved on opening, so users should consider folder volume.

**4.5 Answer examples**

**Q: How do I display only active products whose descriptions include OVER?**  
**A:** Open Product → **Select**. On the first row select Column **Status**, Operator `=`, Value `A`. On the second select **Product Description**, Operator **CONTAINING**, Value `OVER`. Click **OK**. BPAL uses AND across the two rows and refreshes the folder. Click **Save** first only if you want to keep these conditions under a name.

**Q: How do I make a selection for the previous full week?**  
**A:** On a date column choose **RANGE** and enter `SUNDAY-1, SATURDAY-1`. BPAL evaluates those expressions using Sunday-to-Saturday calendar weeks. You can save the selection for repeated use. Be aware that Transaction has additional restrictions and date/period controls.

**Q: I clicked Reset all and now thousands of rows are loading. Why?**  
**A:** In standard Selection Criteria, Reset all removes every retrieval condition. Clicking OK then retrieves all database rows for that folder. Press Stop to halt fetch if appropriate; an initial COUNT may still take time to finish.

## Related

- [Knowledge Base – 2. What BPAL Is and How Its Records Are Organized](./knowledge-base-2-what-bpal-is-and-how-its-records-are-organi.md)
- [Knowledge Base – 3. Standard Folder: Opening, Auto Ref, Refresh and Stop](./knowledge-base-3-standard-folder-opening-auto-ref-refresh-an.md)
- [Knowledge Base – 5. Column Selection (Columns)](./knowledge-base-5-column-selection-columns.md)
- [Knowledge Base – 6. Folder Sort Criteria (Sort)](./knowledge-base-6-folder-sort-criteria-sort.md)
