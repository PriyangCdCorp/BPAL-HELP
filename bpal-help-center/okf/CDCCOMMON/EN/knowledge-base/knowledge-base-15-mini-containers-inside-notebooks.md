---
type: guide
title: Knowledge Base – 15. Mini Containers Inside Notebooks
description: >-
  Knowledge Base: A Mini Container is a folder embedded on a notebook page and
  associated with the notebook's current parent record. Covers: Mini Container;
  update lock on the parent record covers the parent's linked data
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-16
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 15. Mini Containers Inside Notebooks

A **Mini Container** is a folder embedded on a notebook page and associated with the notebook's current parent record. It offers standard folder-style operations as appropriate, and has its own Auto Ref preference. An **update lock on the parent record covers the parent's linked data**, so BPAL does not request additional sub-record locks for its Messages and similar child operations. Adding or editing a child Message saves that child database record immediately; it does not wait for the parent notebook's Apply or OK.

Do not assume that every Mini Container has every main-folder button; use the visible toolbar and authorization. Mini Containers for Messages, Notes and Audit are described below.

## Related

- [Knowledge Base – 13. Folder Split Bar and Scrollbars](./knowledge-base-13-folder-split-bar-and-scrollbars.md)
- [Knowledge Base – 14. Standard Notebook: Navigation, Save and Lookup](./knowledge-base-14-standard-notebook-navigation-save-and-look.md)
- [Knowledge Base – 16. Messages: Record-linked Operational Communications](./knowledge-base-16-messages-record-linked-operational-communi.md)
- [Knowledge Base – 17. Notes and External Attachments](./knowledge-base-17-notes-and-external-attachments.md)
