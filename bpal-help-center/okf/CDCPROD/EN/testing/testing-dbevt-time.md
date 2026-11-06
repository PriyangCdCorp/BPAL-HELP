---
type: guide
title: TESTING – DBEVT_TIME
description: >-
  TESTING: DBEVT PROGRAM -- Hard-coded program name DBEVT CATEGORY -- Hard-coded
  like 'REPORT', 'SAMPLE', 'SCALE' DBEVT TYPE -- Hard-coded like 'AUDITRP',
  'SAMPLE', 'TSGUI Covers: No way to know which programs were configured;
  EVENT_TRACKING_CATEGORY {; DBEVT_CATEGORY_DESC_F/E -- Bilingual support ...
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-6
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – DBEVT_TIME

DBEVT_PROGRAM         -- Hard-coded program name 

    DBEVT_CATEGORY        -- Hard-coded like 'REPORT', 'SAMPLE', 'SCALE' 

    DBEVT_TYPE            -- Hard-coded like 'AUDITRP', 'SAMPLE', 'TSGUI-Truck Scale GUI' 

    DBEVT_DATA            -- JSON for flexibility 

} 

 

Problems emerged quickly: 


**No way to know which programs were configured**

2.4 Evolution Stage 2: Introducing Reference Tables 

2.4.1 The Standardization 

We needed standardization. This led to our first major refactoring: 


**EVENT_TRACKING_CATEGORY {**

    DBEVT_CATEGORY_ID       -- Now using IDs! 

    DBEVT_CATEGORY_NAME     -- 'REPORT', 'SAMPLE', 'SCALE' 


**DBEVT_CATEGORY_DESC_F/E -- Bilingual support added**

} 


**DBEVT_TYPE_ID**

    DBEVT_TYPE_NAME         -- 'AUDITRP', 'SAMPLE', 'TSGUI'

## Related

- [TESTING – CHAPTER 2 – SYSTEM DESIGN AND ARCHITECTURE EVOLUTION](./testing-chapter-2-system-design-and-architecture-evolution.md)
- [TESTING – USER_EVENTS_VIEW (Unified View)](./testing-user-events-view-unified-view.md)
- [TESTING – DBEVT_TYPE_DESC_F/E](./testing-dbevt-type-desc-f-e.md)
- [TESTING – EVENT_TRACKING_CONFIG_DETAIL {](./testing-event-tracking-config-detail.md)
