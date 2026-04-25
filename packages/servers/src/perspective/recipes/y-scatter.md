---
widget: perspective-y-scatter
description: Y Scatter (categorical X, numeric Y). Distribution by category.
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
Numeric distribution along a categorical X-axis (alternative to box plots).

## Example
```
perspective_webmcp_widget_display({name: "perspective-y-scatter", params: { rows: [...], group_by: ['region'], columns: ['sales'] }})
```
