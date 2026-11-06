---
type: guide
title: TESTING – USER_EVENTS_VIEW
description: >-
  TESTING: All EVENT TRACKING fields (date, time, user, data, etc.) Program
  details from CONFIG DETAIL (program, computer, classification) Category name
  and descriptions ( Covers: Support multiple languages; Determines real-time
  vs. non-real-time handling; USER_EVENTS_VIEW acts as a facade; Provide...
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-9
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – USER_EVENTS_VIEW

- All EVENT_TRACKING fields (date, time, user, data, etc.) 

  - Program details from CONFIG_DETAIL (program, computer, classification) 

  - Category name and descriptions (English/French) 

  - Type name and descriptions (English/French) 

  - Filtered by USER_EVENT_TRACKING subscriptions 

“Note: The final fields in the tables are shown in the class diagram below in 2.8” 

2.7 Design Patterns in Our Architecture 

2.7.1 Reference Data Pattern 


**Support multiple languages**

 

2.7.2 Configuration Pattern 


**Determines real-time vs. non-real-time handling**

 

2.7.3 Facade Pattern 


**USER_EVENTS_VIEW acts as a facade**

Hides complexity of joins between event, configuration, reference, and subscription tables 


**Provides simple interface for user-specific event queries**

 

2.7.4 Signal Pattern 


**Decouples event storage from notification processing**

DLL inserts a kick record and signals the service via IPC, keeping event insertion fast

## Related

- [TESTING – DBEVT_TYPE_DESC_F/E](./testing-dbevt-type-desc-f-e.md)
- [TESTING – EVENT_TRACKING_CONFIG_DETAIL {](./testing-event-tracking-config-detail.md)
- [TESTING – Notification Service processes kick records asynchronously](./testing-notification-service-processes-kick-records-asynchro.md)
- [TESTING – FOREIGN KEY](./testing-foreign-key.md)
