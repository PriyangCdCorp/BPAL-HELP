---
type: guide
title: TESTING – Changing dbevt_logging_enabled should update updated_at timestamp
description: >-
  TESTING: Deleting a config should be soft delete or restricted if EVENT
  TRACKING records exist 2.8.3. Covers: DBEVT_CATEGORY_ID; PRIMARY KEY; UNIQUE,
  NOT NULL; VARCHAR(64)
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-13
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – Changing dbevt_logging_enabled should update updated_at timestamp

Deleting a config should be soft delete or restricted if EVENT_TRACKING records exist 

 

2.8.3. EVENT_TRACKING_CATEGORY (Reference/Lookup Table) 

Purpose: Defines standardized event categories. This is a reference table that provides controlled vocabulary for categorizing events. Ensures consistency across the system. 

Design Philosophy: Master data table. Small, relatively static list of categories that classify the nature or domain of events. 

Fields Description: 


**DBEVT_CATEGORY_ID**

INT 


**PRIMARY KEY**

Unique identifier for each category. Used as foreign key in EVENT_TRACKING_CONFIG_DETAIL. 


**UNIQUE, NOT NULL**

Short, unique name for the category. Examples: "REPORT","SCALE". This is the display/reference name used throughout the system. 


**VARCHAR(64)**

 

Detailed description of the category in one language (likely French - based on suffix '_F'). Provides full explanation of what types of events belong to this category. 


**VARCHAR(64)**

 

Detailed description of the category in English (based on suffix '_E').  

 

Business Rules:

## Related

- [TESTING – FOREIGN KEY](./testing-foreign-key.md)
- [TESTING – DEFAULT 'Y', CHECK ('Y','N')](./testing-default-y-check-y-n.md)
- [TESTING – Adding new categories should be an administrative function](./testing-adding-new-categories-should-be-an-administrative-fu.md)
- [TESTING – Types should not be deleted if referenced by existing configurations](./testing-types-should-not-be-deleted-if-referenced-by-existin.md)
