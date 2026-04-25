---
widget: perspective-heatmap
description: Heatmap. Density of a numeric value across two categorical/binned axes.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array }
    group_by: { type: array, description: Y-axis category }
    split_by: { type: array, description: X-axis category }
    columns: { type: array, description: Numeric column to color by }
    aggregates: { type: object }
---

## When to use
Show concentration / intensity across two dimensions (e.g. correlation matrix, calendar heatmap).

## Example
```
perspective_webmcp_widget_display({name: "perspective-heatmap", params: { rows: [...], group_by: ['day'], split_by: ['hour'], columns: ['count'] }})
```
