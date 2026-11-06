---
type: guide
title: TESTING – Types should not be deleted if referenced by existing configurations
description: >-
  TESTING: 2.8.5. USER EVENTS VIEW (View) Purpose: Provides a denormalized,
  user-friendly view of all event tracking data filtered by user subscriptions.
  Covers: DBEVT_UNIQUE_ID; DBEVT_SEQUENCE_NUM; Additional event data in JSON
  format; Current logging status for this configuration; Category descri...
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-15
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – Types should not be deleted if referenced by existing configurations

2.8.5. USER_EVENTS_VIEW (View) 

Purpose: Provides a denormalized, user-friendly view of all event tracking data filtered by user subscriptions. Joins five tables (since the sixth table, EVENT_TRACKING_KICK, is not part of the view) to present complete event information for a specific user without requiring complex joins. 

Design Philosophy: Simplify data access for user-specific event viewing and reporting. Each user sees only the events they have subscribed to. Hides the normalized structure complexity from end users and reporting tools. 

 

Fields Description: 

From EVENT_TRACKING: 


**DBEVT_UNIQUE_ID**

INT 


**DBEVT_SEQUENCE_NUM**

INT 


**Additional event data in JSON format**

From EVENT_TRACKING_CONFIG_DETAIL: 


**Current logging status for this configuration**

From EVENT_TRACKING_CATEGORY: 


**Category description (English)**

 

 

 

From EVENT_TRACKING_TYPE: 


**Type description (English)**

From USER_EVENT_TRACKING:

## Related

- [TESTING – Changing dbevt_logging_enabled should update updated_at timestamp](./testing-changing-dbevt-logging-enabled-should-update-updated.md)
- [TESTING – Adding new categories should be an administrative function](./testing-adding-new-categories-should-be-an-administrative-fu.md)
- [TESTING – Subscription status (Active/Inactive)](./testing-subscription-status-active-inactive.md)
- [TESTING – VARCHAR(2000)](./testing-varchar-2000.md)
