---
widget: perspective-line
description: Line chart (Y Line). Trends over an ordered axis.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array }
    group_by: { type: array, description: Typically a date or sequential column }
    split_by: { type: array, description: Optional series split }
    columns: { type: array }
    aggregates: { type: object }
---

## When to use
Trends across a time / ordered axis. Multi-series via split_by.

## Example
```
perspective_webmcp_widget_display({name: "perspective-line", params: { rows: [...], group_by: ['date'], columns: ['price'] }})
```
