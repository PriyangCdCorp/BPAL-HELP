---
type: guide
title: Knowledge Base – 2. What BPAL Is and How Its Records Are Organized
description: >-
  Knowledge Base: BPAL's central purpose is collecting and managing operational
  transactions.
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-3
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 2. What BPAL Is and How Its Records Are Organized

BPAL's central purpose is collecting and managing operational transactions. Vendor, Client, Product, Contract and similar folders primarily provide master data to support those transactions. Master-data folders may contain thousands of rows, while Transaction tables may contain millions. The Transaction folder includes special retrieval restrictions and a more elaborate Selection Criteria dialog; do not generalize standard-folder instructions to it without checking the dedicated documentation.

BPAL's graphical folder is a **container**. SQL via ODBC retrieves full rows of all available columns into the container. BPAL supports DB2 and Microsoft SQL Server through ODBC. User selection criteria are part of the database query. Once records are in the container, users can change column visibility and sorting locally. Notebook opening usually fetches the record afresh from the database rather than using the folder's stored row as the notebook's authoritative current state.

Users' saved selections, sorts, column layouts, Profiles, Auto Ref preferences, and remembered split-bar locations are associated with individual folders where documented. A folder's initial authority (read-only or update) determines which operations are available.

## Related

- [Knowledge Base – BPAL AI Assistant Knowledge Base](./knowledge-base-bpal-ai-assistant-knowledge-base.md)
- [Knowledge Base – 1. Instructions for the BPAL AI Assistant](./knowledge-base-1-instructions-for-the-bpal-ai-assistant.md)
- [Knowledge Base – 3. Standard Folder: Opening, Auto Ref, Refresh and Stop](./knowledge-base-3-standard-folder-opening-auto-ref-refresh-an.md)
- [Knowledge Base – 4. Database Selection Criteria (Select)](./knowledge-base-4-database-selection-criteria-select.md)
