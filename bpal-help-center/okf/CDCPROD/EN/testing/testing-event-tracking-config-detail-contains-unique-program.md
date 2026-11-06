---
type: guide
title: 'TESTING – EVENT_TRACKING_CONFIG_DETAIL: Contains unique program configurations'
description: >-
  TESTING: Each program configuration is identified by a unique combination of
  program name and parameters, which maps to a single config id. Covers: Step 1:
  Program Initialization; Looks up the matching record in
  EVENT_TRACKING_CONFIG_DETAIL; Step 2: Event Logging Decision; Step 3: Event
  Recording...
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-21
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – EVENT_TRACKING_CONFIG_DETAIL: Contains unique program configurations

Each program configuration is identified by a unique combination of program name and parameters, which maps to a single config_id. This config_id also stores a critical dbevt_logging_enabled flag ('Y' or 'N'). 

A fourth table, USER_EVENT_TRACKING, stores per-user subscriptions linking users to specific event configurations with notification preferences and optional filter criteria. 

A fifth table, EVENT_TRACKING_KICK, stores lightweight signal records that link to EVENT_TRACKING and notify the background Notification Service when new events need notification processing. 

How It Works: 


**Step 1: Program Initialization**

When a program starts, it calls a DLL function which: 


**Looks up the matching record in EVENT_TRACKING_CONFIG_DETAIL**

Returns:  

config_id (unique identifier for this program configuration) 

logging_enabled flag ('Y' or 'N') 


**Step 2: Event Logging Decision**

Throughout program execution, when events occur: 


**Step 3: Event Recording**

When logging is enabled, the program:  


**Calls another DLL function to insert the event record**

Stores only:

## Related

- [TESTING – DEFAULT 5](./testing-default-5.md)
- [TESTING – CHAPTER 3 – HOW WE STORE THE DATA](./testing-chapter-3-how-we-store-the-data.md)
- [TESTING – The config_id reference (not the full program details)](./testing-the-config-id-reference-not-the-full-program-details.md)
