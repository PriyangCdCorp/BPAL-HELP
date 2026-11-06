---
type: guide
title: TESTING – Adding new categories should be an administrative function
description: >-
  TESTING: Categories should not be deleted if referenced by existing
  configurations 2.8.4. Covers: DBEVT_TYPE_ID; PRIMARY KEY; UNIQUE, NOT NULL;
  VARCHAR(64)
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-14
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – Adding new categories should be an administrative function

Categories should not be deleted if referenced by existing configurations 

 

2.8.4. EVENT_TRACKING_TYPE (Reference/Lookup Table) 

Purpose: Defines standardized event types. This reference table provides controlled vocabulary for the type or lifecycle stage of events. Complements categories by describing what happened. 

Design Philosophy: Master data table. Small, relatively static list of types that describe the event lifecycle or outcome. 

Fields Description: 


**DBEVT_TYPE_ID**

INT 


**PRIMARY KEY**

Unique identifier for each type. Used as foreign key in EVENT_TRACKING_CONFIG_DETAIL. 


**UNIQUE, NOT NULL**

Short, unique name for the type. Examples: "ADUITRP","SAMPLE". This is the display/reference name used throughout the system. 


**VARCHAR(64)**

 

Detailed description of the type in one language (likely French - based on suffix '_F').  


**VARCHAR(64)**

 

Detailed description of the type in English (based on suffix '_E').  

 

Business Rules:

## Related

- [TESTING – DEFAULT 'Y', CHECK ('Y','N')](./testing-default-y-check-y-n.md)
- [TESTING – Changing dbevt_logging_enabled should update updated_at timestamp](./testing-changing-dbevt-logging-enabled-should-update-updated.md)
- [TESTING – Types should not be deleted if referenced by existing configurations](./testing-types-should-not-be-deleted-if-referenced-by-existin.md)
- [TESTING – Subscription status (Active/Inactive)](./testing-subscription-status-active-inactive.md)
