---
type: guide
title: TESTING – Subscription status (Active/Inactive)
description: >-
  TESTING: 2.8.6. USER EVENT TRACKING (User Subscription Table) Purpose: Stores
  per-user subscriptions linking users to specific event configurations with
  notification preferences and optional filter criteria. Covers:
  DBUET_UNIQUE_ID; PRIMARY KEY; NOT NULL; FOREIGN KEY; CHAR(1); VARCHAR(5)
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-16
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – Subscription status (Active/Inactive)

2.8.6. USER_EVENT_TRACKING (User Subscription Table) 

Purpose: Stores per-user subscriptions linking users to specific event configurations with notification preferences and optional filter criteria. 

Design Philosophy: Allow individual users to control which events they want to monitor and be notified about. Each subscription can be independently enabled or disabled without removing the configuration. 

Fields Description: 


**DBUET_UNIQUE_ID**

INT 


**PRIMARY KEY**

Unique identifier for each subscription record. Auto-incremented. 


**NOT NULL**

User who owns this subscription. Links to USER_MASTER. 


**FOREIGN KEY**

Reference to EVENT_TRACKING_CONFIG_DETAIL. Identifies which event configuration this subscription monitors. 


**CHAR(1)**

Whether notifications are enabled. 'Y' = notify, 'N' = do not notify. 


**VARCHAR(5)**

Preferred notification delivery method. Values: 'EMAIL', 'SMS', 'BOTH'. 


**CHAR(1)**

Subscription status. 'A' = Active, 'I' = Inactive.

## Related

- [TESTING – Adding new categories should be an administrative function](./testing-adding-new-categories-should-be-an-administrative-fu.md)
- [TESTING – Types should not be deleted if referenced by existing configurations](./testing-types-should-not-be-deleted-if-referenced-by-existin.md)
- [TESTING – VARCHAR(2000)](./testing-varchar-2000.md)
- [TESTING – A user should have only one subscription per config_id](./testing-a-user-should-have-only-one-subscription-per-config-.md)
