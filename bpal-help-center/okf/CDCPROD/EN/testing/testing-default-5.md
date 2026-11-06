---
type: guide
title: TESTING – DEFAULT 5
description: >-
  TESTING: Processing priority set by the DLL based on event classification from
  EVENT TRACKING CONFIG DETAIL at insert time.
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-19
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – DEFAULT 5

Processing priority set by the DLL based on event classification from EVENT_TRACKING_CONFIG_DETAIL at insert time. Lower values are processed first by the Notification Service. Values: 1=REALTIME, 2=CRITICAL, 3=ERROR, 4=WARNING, 5=INFO, 6=NON_REALTIME, 7=STARTUP_EVENT, 8=SHUTDOWN_EVENT. New priority levels can be added without changes to the Notification Service. 

Business Rules: 

One kick record is created per event insert when logging is enabled, regardless of classification. The Notification Service uses the DBETK_PRIORITY to prioritize processing order. 

The DLL inserts the kick record immediately after the EVENT_TRACKING insert succeeds 

The Notification Service updates status from 'P' to 'C' or 'F' after processing 


**Completed kick records can be periodically purged for housekeeping**

If the service is down, kick records accumulate with status 'P' and are processed when the service restarts

## Related

- [TESTING – VARCHAR(2000)](./testing-varchar-2000.md)
- [TESTING – A user should have only one subscription per config_id](./testing-a-user-should-have-only-one-subscription-per-config-.md)
- [TESTING – CHAPTER 3 – HOW WE STORE THE DATA](./testing-chapter-3-how-we-store-the-data.md)
- [TESTING – EVENT_TRACKING_CONFIG_DETAIL: Contains unique program configurations](./testing-event-tracking-config-detail-contains-unique-program.md)
