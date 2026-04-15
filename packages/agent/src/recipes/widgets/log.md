---
widget: log
description: Event log with levels and timestamps
group: rich
schema:
  type: object
  required:
    - entries
  properties:
    title:
      type: string
    entries:
      type: array
      items:
        type: object
        required:
          - message
        properties:
          timestamp:
            type: string
          level:
            type: string
            enum:
              - debug
              - info
              - warn
              - error
          message:
            type: string
          source:
            type: string
---

## When to use
Display an event log — application logs, audit trail, operation history. Each entry can be color-coded by level (debug/info/warn/error).

## How to use
1. Fetch logs via MCP
2. Call `autoui_webmcp_widget_display('log', { title: 'Server Logs', entries: [{ timestamp: '14:32:01', level: 'error', message: 'Connection refused', source: 'db' }, { timestamp: '14:32:05', level: 'info', message: 'Retry successful', source: 'db' }] })`
