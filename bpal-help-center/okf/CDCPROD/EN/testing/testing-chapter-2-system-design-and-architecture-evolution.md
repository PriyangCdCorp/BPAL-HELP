---
type: guide
title: TESTING – CHAPTER 2 – SYSTEM DESIGN AND ARCHITECTURE EVOLUTION
description: >-
  TESTING: 2.1 Design Philosophy The Event Tracking System was designed with a
  simple principle: Start simple, scale smartly. Covers: EVENT_TRACKING (Main
  Event Storage); EVENT_TRACKING_CONFIG_DETAIL (Program Configuration);
  EVENT_LOG_CATEGORY & EVENT_LOG_TYPE (Reference Data); USER_EVENT_TRACKING ...
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-4
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – CHAPTER 2 – SYSTEM DESIGN AND ARCHITECTURE EVOLUTION

2.1 Design Philosophy 

The Event Tracking System was designed with a simple principle: Start simple, scale smartly. Rather than building a complex system upfront, we began with basic event logging and gradually added sophistication based on real-world needs. 

2.2 The Core Design – Understanding the Foundation 

Before diving into how we got here, let's look at the current core design that evolved from our iterations: 

2.2.1 The Six-Table Architecture 


**EVENT_TRACKING (Main Event Storage)**

  v [Links via DBEVT_CONFIG_ID] 


**EVENT_TRACKING_CONFIG_DETAIL (Program Configuration)**

  v [Links via category_id and type_id] 


**EVENT_LOG_CATEGORY & EVENT_LOG_TYPE (Reference Data)**

  v [All joined in] 


**USER_EVENT_TRACKING (User Subscriptions)**

  v [Filtered by user subscriptions] 


**EVENT_TRACKING_KICK (Notification Signal)**

  v [Links via event_id to EVENT_TRACKING]

## Related

- [TESTING – CHAPTER 1 – INTRODUCTION](./testing-chapter-1-introduction.md)
- [TESTING – Configurable message templates for different locales](./testing-configurable-message-templates-for-different-locales.md)
- [TESTING – USER_EVENTS_VIEW (Unified View)](./testing-user-events-view-unified-view.md)
- [TESTING – DBEVT_TIME](./testing-dbevt-time.md)
