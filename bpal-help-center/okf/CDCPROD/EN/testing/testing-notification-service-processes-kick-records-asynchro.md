---
type: guide
title: TESTING – Notification Service processes kick records asynchronously
description: >-
  TESTING: 2.8 Overall Class Diagram 2.8.1. Covers: DBEVT_UNIQUE_ID; PRIMARY
  KEY; NOT NULL; DBEVT_SEQUENCE_NUM; JSON; VARCHAR(12)
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-10
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – Notification Service processes kick records asynchronously

2.8 Overall Class Diagram  

 

 

 

 

 

 

 

2.8.1. EVENT_TRACKING (Main Transaction Table) 

Purpose: Stores individual event occurrences with minimal data by referencing configuration details through config_id. This is the primary transactional table that records each event execution. 

Design Philosophy: Keep the transaction table lean by storing only event-specific runtime data. Static configuration data is referenced via foreign key to avoid redundancy. 

Fields Description: 


**DBEVT_UNIQUE_ID**

INT 


**PRIMARY KEY**

Unique identifier for each event record. Auto-incremented sequence number that uniquely identifies every event logged in the system. 


**NOT NULL**

The date when the event occurred (YYYY-MM-DD). Used for temporal querying, reporting, and event chronology. Essential for audit trails and compliance. 


**NOT NULL**

The time when the event occurred (HH:MM:SS). Provides precise timing information for the event. Combined with DBEVT_DATE gives complete timestamp. 


**DBEVT_SEQUENCE_NUM**

INT 

 

Sequence number for ordering events that occur at the same date/time. Useful for maintaining execution order of rapid-fire events or when multiple events happen in the same second. 


**JSON**

 

Flexible field to store additional event-specific data in JSON format. Can contain custom attributes, error details, performance metrics, or any structured data relevant to the specific event. Provides extensibility without schema changes. 


**VARCHAR(12)**

 

User identifier who triggered or is associated with the event. Used for user activity tracking, security auditing, and accountability. Can be a username, employee ID, or system account.

## Related

- [TESTING – EVENT_TRACKING_CONFIG_DETAIL {](./testing-event-tracking-config-detail.md)
- [TESTING – USER_EVENTS_VIEW](./testing-user-events-view.md)
- [TESTING – FOREIGN KEY](./testing-foreign-key.md)
- [TESTING – DEFAULT 'Y', CHECK ('Y','N')](./testing-default-y-check-y-n.md)
