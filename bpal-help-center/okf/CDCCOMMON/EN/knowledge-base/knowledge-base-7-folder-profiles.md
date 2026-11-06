---
type: guide
title: Knowledge Base – 7. Folder Profiles
description: >-
  Knowledge Base: A Profile is a named set of references to individually saved
  Column, Sort, and Selection configurations. Covers: Profile; references;
  Column; Sort; Selection; Folder Profile; Use Current; takes priority
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-8
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 7. Folder Profiles

A **Profile** is a named set of **references** to individually saved **Column**, **Sort**, and **Selection** configurations. It is not a copy of the individual settings. Each of the three components is optional. A Profile can specify only Selection Criteria, for example, while leaving the current columns and sort unchanged.

In the **Folder Profile** dialog, the three fields let the user pick saved configuration names. **Use Current** fills a field with the name of the saved configuration presently active for that function. Save As gives the Profile its own name; Default designates the default Profile. A default Profile **takes priority** over individually saved default Columns, Sort and Selection Criteria when opening that folder.

Click **OK** on a Profile to apply all the referenced configurations and initiate a Refresh. Where a Profile component is blank, BPAL retains the currently active configuration for that function.

**References remain live**: if Profile `Review` uses saved Sort `Description`, and that Sort is later edited from description-only to description-then-code, Profile `Review` uses the revised saved Sort. If the referenced Sort is deleted, BPAL applies no sort from that reference. The exact response to a deleted referenced Column or Selection configuration is **pending verification**; do not claim that BPAL definitely retrieves all rows or that it definitely displays an error.

**Q: Why did my Profile change without anyone editing the Profile?**  
**A:** A Profile points to named saved configurations. If one of those configurations is edited, the Profile picks up the new definition automatically. Check the referenced Selection, Sort and Column names.

## Related

- [Knowledge Base – 5. Column Selection (Columns)](./knowledge-base-5-column-selection-columns.md)
- [Knowledge Base – 6. Folder Sort Criteria (Sort)](./knowledge-base-6-folder-sort-criteria-sort.md)
- [Knowledge Base – 8. Find: Direct Record Lookup](./knowledge-base-8-find-direct-record-lookup.md)
- [Knowledge Base – 9. Open, Read Only, and CDC Manager Record Locks](./knowledge-base-9-open-read-only-and-cdc-manager-record-locks.md)
