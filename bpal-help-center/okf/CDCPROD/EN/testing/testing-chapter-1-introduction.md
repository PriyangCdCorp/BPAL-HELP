---
type: guide
title: TESTING – CHAPTER 1 – INTRODUCTION
description: >-
  TESTING: 1.1 Overview The Event Tracking System (Phase 1) is a comprehensive
  database-driven solution designed to capture and store system events across
  the entire BPAL application and services. Covers: Centralized Event Logging;
  User Event Subscription; Notification Signaling; Notification queue...
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-2
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – CHAPTER 1 – INTRODUCTION

1.1 Overview 

The Event Tracking System (Phase 1) is a comprehensive database-driven solution designed to capture and store system events across the entire BPAL application and services. Built with scalability and flexibility in mind, this system provides a centralized repository for all application events, establishing the foundation for future notification capabilities. 

 

“Note: This document covers Phase 1 (Data Storage). Phase 2 (Real-Time Notification System) will be planned separately once the data layer is stable.” 

1.2 Purpose 

In modern distributed systems, tracking events across multiple applications, services, and platforms presents significant challenges. Phase 1 addresses these challenges by providing: 

 


**Centralized Event Logging**

A single source of truth for all system events across BPAL 


**User Event Subscription**

Users can subscribe to specific event configurations with per-user notification preferences and data filters 


**Notification Signaling**

Lightweight kick records enable immediate notification service activation when events are logged, without impacting event insertion performance 

 

Out of Scope for Phase 1:  


**Notification queue processing**

 

1.3 Key Features 

1.3.1 Event Classification 

The system categorizes events into multiple classifications: 

 


**REALTIME: Events requiring immediate notification**

NON_REALTIME: Events stored for historical reference without notifications 


**STARTUP_EVENT/SHUTDOWN_EVENT: System lifecycle events**

1.3.2 Flexible Event Data Storage 

Events utilize a hybrid storage approach: 

Structured fields for common attributes (date, time, user, program, etc.) 


**Supports unlimited custom fields without schema changes**

 

1.3.3 Multi-Language Support 

The system supports bilingual descriptions and messages: 

English (_E suffix) and French (_F suffix) variants for all descriptive fields

## Related

- [TESTING](./testing.md)
- [TESTING – Configurable message templates for different locales](./testing-configurable-message-templates-for-different-locales.md)
- [TESTING – CHAPTER 2 – SYSTEM DESIGN AND ARCHITECTURE EVOLUTION](./testing-chapter-2-system-design-and-architecture-evolution.md)
