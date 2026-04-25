---
widget: perspective-area
description: Area chart (Y Area). Cumulative magnitude over an ordered axis.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array }
    group_by: { type: array }
    split_by: { type: array }
    columns: { type: array }
    aggregates: { type: object }
---

## When to use
Magnitude over time, especially when stacking via split_by.

## Example
```
perspective_webmcp_widget_display({name: "perspective-area", params: { rows: [...], group_by: ['date'], split_by: ['region'], columns: ['volume'] }})
```
