---
type: guide
title: TESTING – VARCHAR(2000)
description: 'TESTING: Optional filter criteria stored as a JSON array.'
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-17
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – VARCHAR(2000)

Optional filter criteria stored as a JSON array. Each element contains an operator and value applied against DBEVT_DATA when evaluating notifications. Supports up to 5 filter rows. 

Business Rules: 

Each user can have multiple subscriptions to different event configurations

## Related

- [TESTING – Types should not be deleted if referenced by existing configurations](./testing-types-should-not-be-deleted-if-referenced-by-existin.md)
- [TESTING – Subscription status (Active/Inactive)](./testing-subscription-status-active-inactive.md)
- [TESTING – A user should have only one subscription per config_id](./testing-a-user-should-have-only-one-subscription-per-config-.md)
- [TESTING – DEFAULT 5](./testing-default-5.md)
