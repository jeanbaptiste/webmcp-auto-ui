---
widget: perspective-y-area
description: Y Area chart. Explicit Y-axis area variant.
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
Stacked magnitudes over an ordered axis.

## Example
```
perspective_webmcp_widget_display({name: "perspective-y-area", params: { rows: [...], group_by: ['date'], columns: ['users'] }})
```
