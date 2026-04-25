---
widget: perspective-pivot
description: Pivot table with row groups, column splits, and aggregates. Like Excel pivot tables.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array, description: Array of row objects }
    group_by: { type: array, description: Columns to group by (rows of pivot) }
    split_by: { type: array, description: Columns to split by (cols of pivot) }
    columns: { type: array, description: Columns to aggregate }
    aggregates: { type: object, description: "Per-column aggregate, e.g. {sales:'sum', count:'count'}" }
    sort: { type: array }
    filter: { type: array }
---

## When to use
Cross-tabulate counts/sums/averages by category. Drill into multi-dimensional data.

## Example
```
perspective_webmcp_widget_display({name: "perspective-pivot", params: { rows: [...], group_by: ['region'], split_by: ['quarter'], columns: ['sales'], aggregates: {sales:'sum'} }})
```
