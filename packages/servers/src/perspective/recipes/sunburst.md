---
widget: perspective-sunburst
description: Sunburst. Radial hierarchy — concentric rings represent depth.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array }
    group_by: { type: array, description: Hierarchy levels (outer to inner) }
    split_by: { type: array }
    columns: { type: array, description: Size column }
    aggregates: { type: object }
---

## When to use
Hierarchical proportions when treemap is too rectangular for the story.

## Example
```
perspective_webmcp_widget_display({name: "perspective-sunburst", params: { rows: [...], group_by: ['continent','country'], columns: ['population'] }})
```
