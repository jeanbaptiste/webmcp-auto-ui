---
widget: perspective-bar
description: Bar chart (Y Bar — vertical bars). Compares an aggregated value across categories.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array, description: Array of row objects }
    group_by: { type: array, description: Categorical column(s) for the bars }
    split_by: { type: array, description: Optional split for stacked/grouped bars }
    columns: { type: array, description: Numeric column(s) to plot }
    aggregates: { type: object }
---

## When to use
Compare a numeric measure across categories. Use split_by to stack subgroups.

## Example
```
perspective_webmcp_widget_display({name: "perspective-bar", params: { rows: [...], group_by: ['region'], columns: ['sales'] }})
```
