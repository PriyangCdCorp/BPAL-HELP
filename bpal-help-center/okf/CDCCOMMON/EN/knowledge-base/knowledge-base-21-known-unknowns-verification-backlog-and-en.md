---
type: guide
title: >-
  Knowledge Base – 21. Known Unknowns, Verification Backlog and Enhancement
  Proposals
description: >-
  Knowledge Base: 21.1 Pending verification (do not assert as fact) V-001 —
  Referenced Column/Selection deleted: Exact folder behaviour when an applied
  Profile points to deleted saved Column or Selection configurations. Covers:
  21.1 Pending verification (do not assert as fact); V-001 — Referenced C...
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-22
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 21. Known Unknowns, Verification Backlog and Enhancement Proposals

**21.1 Pending verification (do not assert as fact)**

- **V-001 — Referenced Column/Selection deleted:** Exact folder behaviour when an applied Profile points to deleted saved Column or Selection configurations. Missing Sort yields no sort, but other missing references are unverified.
- **V-002 — Child-data auditing:** Whether Message, Note and other Mini Container changes appear in parent Audit, elsewhere, or are missing from recorded audits.
- **V-003 — Info icon:** The circled `i` is identified as **Info**, but its exact action beyond field information/description was not fully demonstrated.
- **V-004 — Partial notebook validation details:** Field-by-field New/Update rules differ by notebook and remain to be documented.
- **V-005 — Transaction specific controls:** Exact interaction of statuses, periods, tests, date types and special transaction notebook actions awaits dedicated walkthrough.
- **V-006 — Error paths:** Some failure and lock-release edge cases were discussed broadly; detailed timeout, crash and recovery semantics were not established.

**21.2 Proposed enhancements, not deployed features**

- **REF-001 — Cancel SQL COUNT:** Investigate requesting ODBC statement cancellation during the initial COUNT phase, rather than waiting for COUNT to return. Candidate interfaces include `SQLCancelHandle(SQL_HANDLE_STMT, hStmt)` and `SQLCancel`, with driver/thread coordination and tests against DB2 and SQL Server.
- **REF-002 — More informative final status:** Distinguish completion from interruption and show `rows displayed / rows matching`, for example `234 of 1586 rows displayed - STOPPED (1.487 seconds)` rather than only `234 rows displayed (...)`.
- **PROF-001 — Profile reference validation:** Warn about Profiles dependent on saved configurations being deleted and detect missing references when a Profile is applied; particularly avoid silent unexpected selection behaviour.
- **AUD-001 — Verify related-record audit coverage:** Investigate apparent lack of visible audit history for edited Message or other Mini Container data; determine whether audits are stored elsewhere or are not being recorded.

These are investigative work items, not instructions to users and not claims of implemented functionality.

## Related

- [Knowledge Base – 19. Exceptional Transaction Folder: Confirmed Boundaries Only](./knowledge-base-19-exceptional-transaction-folder-confirmed-b.md)
- [Knowledge Base – 20. Troubleshooting and Quick Answers](./knowledge-base-20-troubleshooting-and-quick-answers.md)
- [Knowledge Base – 22. Training Examples: User Intent → Correct Answer](./knowledge-base-22-training-examples-user-intent-correct-answ.md)
- [Knowledge Base – 23. Maintenance and Next Training Modules](./knowledge-base-23-maintenance-and-next-training-modules.md)
