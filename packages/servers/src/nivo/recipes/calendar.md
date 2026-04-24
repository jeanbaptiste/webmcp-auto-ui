---
widget: nivo-calendar
description: GitHub-style calendar heatmap — daily values over one or more years.
group: nivo
schema:
  type: object
  required: [data, from, to]
  properties:
    data: { type: array, description: "[{ day: 'YYYY-MM-DD', value: number }, ...]" }
    from: { type: string, description: "Start date 'YYYY-MM-DD'" }
    to: { type: string, description: "End date 'YYYY-MM-DD'" }
---

## When to use
Show daily activity across weeks, months, or years.

## Example
```
nivo_webmcp_widget_display({name: "nivo-calendar", params: { data: [{day:'2026-01-15', value:5}], from:'2026-01-01', to:'2026-12-31' }})
```
