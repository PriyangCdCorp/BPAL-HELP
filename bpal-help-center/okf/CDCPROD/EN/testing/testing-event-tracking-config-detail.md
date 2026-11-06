---
type: guide
title: 'TESTING – EVENT_TRACKING_CONFIG_DETAIL {'
description: >-
  TESTING: dbevt config id -- Unique config identifier dbevt program -- Which
  program?
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-8
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – EVENT_TRACKING_CONFIG_DETAIL {

dbevt_config_id            -- Unique config identifier 

    dbevt_program              -- Which program? 

    dbevt_category_id          -- Links to EVENT_LOG_CATEGORY 

    dbevt_type_id              -- Links to EVENT_LOG_TYPE 

    dbevt_event_classification -- REALTIME, NON_REALTIME, etc. 

} 

2.5.2 The Clever Connection 

Instead of changing EVENT_TRACKING structure dramatically, we: 


**EVENT_TRACKING {**

    ... 

    DBEVT_CONFIG_ID     -- This one field links to everything! 

    ... 

} 

2.6 Evolution Stage 4: The Unified View 

We need to join 5 tables just to see event details! So, we created a view that does all the joining:

## Related

- [TESTING – DBEVT_TIME](./testing-dbevt-time.md)
- [TESTING – DBEVT_TYPE_DESC_F/E](./testing-dbevt-type-desc-f-e.md)
- [TESTING – USER_EVENTS_VIEW](./testing-user-events-view.md)
- [TESTING – Notification Service processes kick records asynchronously](./testing-notification-service-processes-kick-records-asynchro.md)
