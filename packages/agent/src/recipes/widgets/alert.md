---
widget: alert
description: System alert or notification
group: simple
schema:
  type: object
  required:
    - title
  properties:
    title:
      type: string
    message:
      type: string
    level:
      type: string
      enum:
        - info
        - warn
        - error
---

## When to use
Signal important information, a warning, or an error to the user. Useful after an action that requires attention (e.g. threshold exceeded, operation failed).

## How to use
1. Determine the alert level based on context ('info', 'warn', 'error')
2. Call `autoui_webmcp_widget_display('alert', { title: 'Quota exceeded', message: 'Storage usage is above 90%', level: 'warn' })`
