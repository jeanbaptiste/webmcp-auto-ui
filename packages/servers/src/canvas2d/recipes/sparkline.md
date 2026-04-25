---
widget: canvas2d-sparkline
description: Minimal inline sparkline (no axes)
group: canvas2d
schema:
  type: object
  required: [values]
  properties:
    values: { type: array, items: { type: number } }
    color: { type: string }
    filled: { type: boolean, default: true }
---

## When to use
Compact trend indicator embedded in text or table cells.

## How
```
widget_display({name: "canvas2d-sparkline", params: {
  values: [5, 8, 3, 12, 7, 15, 10],
  color: '#3b82f6'
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-sparkline", params: {values: [5, 8, 3, 12, 7, 15, 10], color: "#3b82f6"}})
```
