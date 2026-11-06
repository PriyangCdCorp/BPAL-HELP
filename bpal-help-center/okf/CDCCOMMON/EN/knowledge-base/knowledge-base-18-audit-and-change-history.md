---
type: guide
title: Knowledge Base – 18. Audit and Change History
description: >-
  Knowledge Base: The Audit page displays information such as the record's
  original Insert user/date/time and most recent Update user/date/time, plus an
  embedded Audit Mini Container with past change events. Covers: Audit; Insert;
  Update; Audit Detail; Old Data; New Data; one audit event; Pending v...
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-19
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 18. Audit and Change History

The **Audit** page displays information such as the record's original **Insert** user/date/time and most recent **Update** user/date/time, plus an embedded Audit Mini Container with past change events. Opening an event displays an **Audit Detail** window with action (for example Update), precise timestamp, user ID/name, table/key, changed column names and **Old Data** versus **New Data**. Several field changes committed together produce **one audit event** containing all changed field entries, rather than one event per field. An Audit Detail window provides Close and Print controls.

Example: a saved update to Product 004 may show French Description, English Description, Tickets In and Moisture in one Audit Detail, with individual old/new values. The audit is a historical record and is not itself a mechanism to undo the edits.

**Pending verification:** The walkthrough did not establish whether changes to child Messages or other Mini Container rows are represented in the parent's Audit tab or a separate audit facility. An apparent gap was noticed, but has **not** been confirmed as missing database audit data. Do not tell users that child Messages are definitely unaudited.

**Q: Who changed a Product description and what was it before?**  
**A:** Open the Product notebook, go to **Audit**, and open the relevant Update event. Audit Detail identifies the user, timestamp, changed field, old value and new value.

## Related

- [Knowledge Base – 16. Messages: Record-linked Operational Communications](./knowledge-base-16-messages-record-linked-operational-communi.md)
- [Knowledge Base – 17. Notes and External Attachments](./knowledge-base-17-notes-and-external-attachments.md)
- [Knowledge Base – 19. Exceptional Transaction Folder: Confirmed Boundaries Only](./knowledge-base-19-exceptional-transaction-folder-confirmed-b.md)
- [Knowledge Base – 20. Troubleshooting and Quick Answers](./knowledge-base-20-troubleshooting-and-quick-answers.md)
