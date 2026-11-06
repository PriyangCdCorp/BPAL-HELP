---
type: guide
title: TESTING – FOREIGN KEY
description: >-
  TESTING: Reference to EVENT TRACKING CONFIG DETAIL table. Covers:
  DBEVT_CONFIG_ID; PRIMARY KEY; DBEVT_CATEGORY_ID; FOREIGN KEY; DBEVT_TYPE_ID;
  VARCHAR(64); DEFAULT CURRENT_TIMESTAMP; NOT NULL
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-11
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – FOREIGN KEY

Reference to EVENT_TRACKING_CONFIG_DETAIL table. This is the key field that enables data normalization - links to all static configuration information about the program/event type. 

 

2.8.2. EVENT_TRACKING_CONFIG_DETAIL (Configuration Master Table) 

Purpose: Stores reusable program configurations. Acts as a master reference table that contains all static information about programs, their classifications, and logging settings. Each unique program configuration gets one record. 

Design Philosophy: Centralize all program metadata in one place. When the same program executes multiple times, EVENT_TRACKING only stores the config_id reference, not the full program details. 

Fields Description: 


**DBEVT_CONFIG_ID**

INT 


**PRIMARY KEY**

Unique identifier for each program configuration. Returned by the DLL function and used as foreign key in EVENT_TRACKING table. 


**DBEVT_CATEGORY_ID**

INT 


**FOREIGN KEY**

Reference to EVENT_TRACKING_CATEGORY table. Links this configuration to a predefined category (e.g., "Batch Process", "User Interface", "API Call"). 


**DBEVT_TYPE_ID**

INT 


**FOREIGN KEY**

Reference to EVENT_TRACKING_TYPE table. Links this configuration to a predefined type (e.g., "Start", "End", "Error", "Warning"). 


**VARCHAR(64)**

 

Event description in English. Used in notification messages and UI display. 


**VARCHAR(64)**

 

Event description in French. Used in notification messages and UI display. 


**DEFAULT CURRENT_TIMESTAMP**

Timestamp when this configuration record was first created. Useful for auditing when new programs were added to the tracking system. 


**DEFAULT CURRENT_TIMESTAMP**

Timestamp of the last update to this configuration. Automatically updated when any field changes. Tracks configuration maintenance history. 


**VARCHAR(64)**

 

Computer or server name where this program typically runs. Can be hostname, IP address, or server identifier. Useful for environment-specific configurations. 


**NOT NULL**

Name of the program or executable. This could be a filename (e.g., "backup.exe"). Core identifier for the configuration. 


**VARCHAR(128)**

 

Default or typical command line parameters used when executing the program. Different parameter combinations can create different config_ids for the same program. 


**VARCHAR(20)**

 

High-level classification of the event (e.g., "real-time", "system", "Security"). Provides additional categorization beyond category_id and type_id. 


**VARCHAR(64)**

 

Program description in french language (likely French language - based on suffix '_f).  


**VARCHAR(64)**

 

Program description in english language (likely English - based on suffix '_e').

## Related

- [TESTING – USER_EVENTS_VIEW](./testing-user-events-view.md)
- [TESTING – Notification Service processes kick records asynchronously](./testing-notification-service-processes-kick-records-asynchro.md)
- [TESTING – DEFAULT 'Y', CHECK ('Y','N')](./testing-default-y-check-y-n.md)
- [TESTING – Changing dbevt_logging_enabled should update updated_at timestamp](./testing-changing-dbevt-logging-enabled-should-update-updated.md)
