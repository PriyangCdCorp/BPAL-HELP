---
type: guide
title: Knowledge Base – 20. Troubleshooting and Quick Answers
description: >-
  Knowledge Base: 20.1 What to ask before troubleshooting Ask: Which folder?
  Covers: 20.1 What to ask before troubleshooting; Which folder?; Which button
  or menu?; What exact message appeared?; Read-only or update authority?; Does
  the issue involve data already displayed, a new database retrieval, ...
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-21
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 20. Troubleshooting and Quick Answers

**20.1 What to ask before troubleshooting**

Ask: **Which folder?** **Which button or menu?** **What exact message appeared?** **Read-only or update authority?** **Does the issue involve data already displayed, a new database retrieval, or a notebook?** Avoid asking all five if the user's issue is already clear.

**20.2 Common symptoms and documented explanations**

**New, Copy or Delete button missing** — The folder has been initialized with read-only authority for this user, so those buttons are not shown. Contact an authorized BPAL administrator if update access is required.

**Open says select a row** — Highlight at least one folder row and click Open again.

**Record locked by someone else** — The popup names the lock holder and contact details and offers read-only access. That person's update notebook must close to release the lock.

**A value lookup rejects a typed code** — The code is validated against its linked table. Use the magnifying-glass review folder to inspect permitted entries.

**Numeric selection operator warning** — Choose an operator compatible with the numeric field; text operators such as STARTING WITH are not valid for numeric fields.

**Newly added record appears outside the current sort** — It is intentionally appended and highlighted. Refresh to reapply selection and sorting; it may then disappear if it does not match the criteria.

**A saved Profile no longer sorts** — Its referenced Sort configuration may have been deleted. Inspect the Profile references.

**A CSV does not contain a field** — Only visible folder columns are exported. Use Columns to show it, then export again.

**A CSV contains fewer rows than expected** — Export uses the rows actually loaded into the container. Check Selection Criteria and whether Refresh was interrupted.

**A Note attachment won't open** — BPAL stores a path, not the attachment bytes. Confirm the target location exists and is accessible.

**Audit Detail shows several changed fields** — One committed operation produces one audit event containing the fields changed in that operation.

## Related

- [Knowledge Base – 18. Audit and Change History](./knowledge-base-18-audit-and-change-history.md)
- [Knowledge Base – 19. Exceptional Transaction Folder: Confirmed Boundaries Only](./knowledge-base-19-exceptional-transaction-folder-confirmed-b.md)
- [Knowledge Base – 21. Known Unknowns, Verification Backlog and Enhancement Proposals](./knowledge-base-21-known-unknowns-verification-backlog-and-en.md)
- [Knowledge Base – 22. Training Examples: User Intent → Correct Answer](./knowledge-base-22-training-examples-user-intent-correct-answ.md)
