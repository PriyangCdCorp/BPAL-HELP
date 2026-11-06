---
type: guide
title: 'TESTING – DEFAULT ''Y'', CHECK (''Y'',''N'')'
description: >-
  TESTING: Critical field: Controls whether events for this configuration should
  be logged.
tags:
  - cdcprod
  - testing
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: testing-12
    resource: CDCPROD/English/TESTING.txt
    title: TESTING.txt
---
# TESTING – DEFAULT 'Y', CHECK ('Y','N')

Critical field: Controls whether events for this configuration should be logged. 'Y' = logging enabled, 'N' = logging disabled. Allows dynamic control of logging without code changes. Used by DLL to inform application whether to create EVENT_TRACKING records. 

 

Business Rules: 

Each unique combination of program + parameters + computer should have only one config_id

## Related

- [TESTING – Notification Service processes kick records asynchronously](./testing-notification-service-processes-kick-records-asynchro.md)
- [TESTING – FOREIGN KEY](./testing-foreign-key.md)
- [TESTING – Changing dbevt_logging_enabled should update updated_at timestamp](./testing-changing-dbevt-logging-enabled-should-update-updated.md)
- [TESTING – Adding new categories should be an administrative function](./testing-adding-new-categories-should-be-an-administrative-fu.md)
