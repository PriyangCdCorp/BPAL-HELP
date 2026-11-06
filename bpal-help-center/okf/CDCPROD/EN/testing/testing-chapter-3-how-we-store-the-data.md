---
type: guide
title: TESTING – CHAPTER 3 – HOW WE STORE THE DATA
description: >-
  TESTING: Our event tracking system uses a normalized database design with a
  configuration-based reference system.
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-20
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – CHAPTER 3 – HOW WE STORE THE DATA

Our event tracking system uses a normalized database design with a configuration-based reference system. The key innovation is separating static program configuration from dynamic event data, combined with centralized logging control through a DLL interface. User subscriptions allow individual users to define which events they want to see and be notified about. 

The Core Concept: 

Three reference tables are pre-populated with master data: 

EVENT_TRACKING_CATEGORY: Defines event categories (e.g., "REPORT", "SCALE")

## Related

- [TESTING – A user should have only one subscription per config_id](./testing-a-user-should-have-only-one-subscription-per-config-.md)
- [TESTING – DEFAULT 5](./testing-default-5.md)
- [TESTING – EVENT_TRACKING_CONFIG_DETAIL: Contains unique program configurations](./testing-event-tracking-config-detail-contains-unique-program.md)
- [TESTING – The config_id reference (not the full program details)](./testing-the-config-id-reference-not-the-full-program-details.md)
