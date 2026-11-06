---
type: guide
title: TESTING – Configurable message templates for different locales
description: >-
  TESTING: 1.3.4 User Event Subscription Users can subscribe to specific event
  types and choose to be notified when those events occur Each subscription
  supports notificat
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-3
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – Configurable message templates for different locales

1.3.4 User Event Subscription 

Users can subscribe to specific event types and choose to be notified when those events occur 

Each subscription supports notification preferences including preferred delivery method 

Optional filter criteria allow users to narrow notifications to only events matching specific conditions in the event data 

Subscriptions can be enabled or disabled independently without removing the configuration 

 

1.3.5 Notification Signaling 

When an event is logged, a lightweight kick record is created to signal the background Notification Service 

The kick mechanism uses Inter-Process Communication (IPC) to wake the service immediately without polling 

Kick records track processing status (Pending, Complete, Failed) for reliability 

Event classification is stored in the kick record to enable priority-based processing by the Notification Service (REALTIME/CRITICAL/ERROR processed first)

## Related

- [TESTING](./testing.md)
- [TESTING – CHAPTER 1 – INTRODUCTION](./testing-chapter-1-introduction.md)
- [TESTING – CHAPTER 2 – SYSTEM DESIGN AND ARCHITECTURE EVOLUTION](./testing-chapter-2-system-design-and-architecture-evolution.md)
- [TESTING – USER_EVENTS_VIEW (Unified View)](./testing-user-events-view-unified-view.md)
