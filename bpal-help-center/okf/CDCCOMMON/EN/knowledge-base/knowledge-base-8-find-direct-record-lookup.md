---
type: guide
title: 'Knowledge Base – 8. Find: Direct Record Lookup'
description: >-
  Knowledge Base: Find uses a primary key to query the database and open the
  appropriate notebook, even if the record is not in the current folder results.
  Covers: Find; not in the current folder results; not; history of prior Find
  attempts; Read Only; Contract; Selection Criteria; Vendor and Client
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-9
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 8. Find: Direct Record Lookup

**Find** uses a primary key to query the database and open the appropriate notebook, even if the record is **not in the current folder results**. It does **not** add that record to the folder container or change the current displayed rows. Find's value dropdown holds a **history of prior Find attempts**, not all valid database codes.

When the user clicks OK, BPAL opens the notebook in update or read-only mode according to user authority and the optional **Read Only** checkbox. When Find fails to find the key, BPAL shows an error and leaves the Find dialog open so the value can be corrected. The standard Find function is available in most folders, but is intentionally omitted from a small number of complex folders, including **Contract**; use **Selection Criteria** instead there.

**Vendor and Client** are the two standard folders with a composite code/location primary key. The first location created for a code is designated as primary. An existing secondary location can subsequently be changed to primary, or a new location can be designated primary; BPAL removes the primary designation from the previous location. Entering **code alone** in Find retrieves the **currently primary location**, even if other locations exist. Entering code **and** location retrieves that specific location. To list all locations, use Selection Criteria on the code.

**Q: How do I find a product that isn't displayed in my folder?**  
**A:** Click **Find**, enter its Product Code, and click **OK**. BPAL retrieves it directly by key and opens its notebook. The existing folder results remain unchanged.

**Q: Why does Find show the primary Vendor location rather than the location I want?**  
**A:** If you enter only the Vendor Code, Find selects its designated primary location. Enter Vendor Code and Location to open a specific location, or use **Select** with Vendor Code to display all its locations.

## Related

- [Knowledge Base – 6. Folder Sort Criteria (Sort)](./knowledge-base-6-folder-sort-criteria-sort.md)
- [Knowledge Base – 7. Folder Profiles](./knowledge-base-7-folder-profiles.md)
- [Knowledge Base – 9. Open, Read Only, and CDC Manager Record Locks](./knowledge-base-9-open-read-only-and-cdc-manager-record-locks.md)
- [Knowledge Base – 10. New and Copy](./knowledge-base-10-new-and-copy.md)
