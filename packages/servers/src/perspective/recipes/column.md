---
widget: perspective-column
description: Column chart (X Bar — horizontal bars). Long category labels.
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
Same as bar, but horizontal. Use when category labels are long.

## Example
```
perspective_webmcp_widget_display({name: "perspective-column", params: { rows: [...], group_by: ['country'], columns: ['gdp'] }})
```
