---
type: guide
title: TESTING – The config_id reference (not the full program details)
description: >-
  TESTING: After a successful insert, the DLL: Inserts a kick record into EVENT
  TRACKING KICK with the event id, priority (mapped from event classification),
  and status 'P Covers: Step 4: Data Retrieval; Query the USER_EVENTS_VIEW
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-22
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – The config_id reference (not the full program details)

After a successful insert, the DLL:  

Inserts a kick record into EVENT_TRACKING_KICK with the event_id, priority (mapped from event classification), and status 'P' 

Signals the Notification Service via IPC (Named Event) to process the new kick record 

The calling application returns immediately — notification processing happens asynchronously in the background service 

Every event gets a kick record. The DLL maps the event classification to a priority value in the kick record. The Notification Service processes kick records in priority order (lower values first), ensuring REALTIME and CRITICAL events are handled before INFO or NON_REALTIME events. 


**Step 4: Data Retrieval**

To view complete event information: 


**Query the USER_EVENTS_VIEW**

The view automatically joins EVENT_TRACKING with all reference tables and USER_EVENT_TRACKING using config_id 

Returns complete event details filtered by the user's subscriptions, including program information, categories, types, and descriptions

## Related

- [TESTING – CHAPTER 3 – HOW WE STORE THE DATA](./testing-chapter-3-how-we-store-the-data.md)
- [TESTING – EVENT_TRACKING_CONFIG_DETAIL: Contains unique program configurations](./testing-event-tracking-config-detail-contains-unique-program.md)
