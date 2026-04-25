---
widget: perspective-treemap
description: Treemap. Hierarchical sized rectangles — part-of-whole with depth.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array }
    group_by: { type: array, description: Hierarchy levels (outer to inner) }
    split_by: { type: array, description: Optional color group }
    columns: { type: array, description: Size column }
    aggregates: { type: object }
---

## When to use
Visualize part-of-whole with hierarchy. group_by accepts multiple levels.

## Example
```
perspective_webmcp_widget_display({name: "perspective-treemap", params: { rows: [...], group_by: ['region','country'], columns: ['population'] }})
```
