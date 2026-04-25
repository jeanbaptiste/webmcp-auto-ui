---
widget: perspective-x-bar
description: X Bar (horizontal bars). Explicit horizontal-bar variant.
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
Horizontal bars (X-axis is the value, Y-axis is the category).

## Example
```
perspective_webmcp_widget_display({name: "perspective-x-bar", params: { rows: [...], group_by: ['city'], columns: ['population'] }})
```
