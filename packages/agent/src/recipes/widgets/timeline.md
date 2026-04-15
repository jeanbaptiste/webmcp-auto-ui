---
widget: timeline
description: Event timeline with status
group: rich
schema:
  type: object
  required:
    - events
  properties:
    title:
      type: string
    events:
      type: array
      items:
        type: object
        required:
          - title
        properties:
          date:
            type: string
          title:
            type: string
          description:
            type: string
          status:
            type: string
            enum:
              - done
              - active
              - pending
---

## When to use
Display a sequence of chronological events — history, process steps, activity log. Each event can have a status (done/active/pending).

## How to use
1. Fetch events via MCP, sort them chronologically
2. Call `autoui_webmcp_widget_display('timeline', { title: 'Order History', events: [{ date: '2024-01-15', title: 'Order placed', status: 'done' }, { date: '2024-01-16', title: 'Shipped', status: 'active' }] })`
