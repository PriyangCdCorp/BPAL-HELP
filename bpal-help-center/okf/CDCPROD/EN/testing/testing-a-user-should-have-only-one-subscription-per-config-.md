---
type: guide
title: TESTING – A user should have only one subscription per config_id
description: >-
  TESTING: Filters are always stored with English operator names regardless of
  UI language Inactive subscriptions are retained for re-activation but are
  excluded from notification processing 2.8.7. Covers: DBETK_UNIQUE_ID; PRIMARY
  KEY; DBETK_EVENT_ID; FOREIGN KEY; DEFAULT 'P'; DEFAULT GETDATE(); NU...
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-18
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – A user should have only one subscription per config_id

Filters are always stored with English operator names regardless of UI language 

Inactive subscriptions are retained for re-activation but are excluded from notification processing 


2.8.7. EVENT_TRACKING_KICK (Notification Signal Table) 

Purpose: Stores lightweight signal records that notify the background Notification Service when new events require notification processing. Each record links to a specific event in EVENT_TRACKING and tracks whether the service has processed it. 

Design Philosophy: Keep event insertion fast by separating the notification signal from notification processing. The DLL inserts a minimal kick record immediately after logging an event, then signals the service via IPC. The service processes kick records asynchronously, avoiding any performance impact on the calling application. 

Fields Description: 


**DBETK_UNIQUE_ID**

INT 


**PRIMARY KEY**

Unique identifier for each kick record. Auto-incremented. 


**DBETK_EVENT_ID**

INT 


**FOREIGN KEY**

Reference to EVENT_TRACKING (DBEVT_UNIQUE_ID). Links this kick record to the specific event that needs notification processing. 


**DEFAULT 'P'**

Processing status. 'P' = Pending (awaiting service), 'C' = Complete (processed), 'F' = Failed (error occurred). 


**DEFAULT GETDATE()**

Timestamp when the kick record was created. Set automatically at insert time. 


**NULL**

Timestamp when the Notification Service finished processing this record. NULL until processed. 


**DBETK_PRIORITY**

INT

## Related

- [TESTING – Subscription status (Active/Inactive)](./testing-subscription-status-active-inactive.md)
- [TESTING – VARCHAR(2000)](./testing-varchar-2000.md)
- [TESTING – DEFAULT 5](./testing-default-5.md)
- [TESTING – CHAPTER 3 – HOW WE STORE THE DATA](./testing-chapter-3-how-we-store-the-data.md)
