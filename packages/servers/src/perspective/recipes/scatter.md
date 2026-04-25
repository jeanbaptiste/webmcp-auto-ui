---
widget: perspective-scatter
description: X/Y scatter plot. Correlate two numeric columns; optional size/color via extra columns.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array }
    group_by: { type: array, description: Categories that become points }
    split_by: { type: array, description: Optional series split (color) }
    columns: { type: array, description: "[xCol, yCol, sizeCol?, colorCol?]" }
    aggregates: { type: object }
---

## When to use
Correlate 2+ numeric measures across categories. Add sizeCol/colorCol for bubble charts.

## Example
```
perspective_webmcp_widget_display({name: "perspective-scatter", params: { rows: [...], group_by: ['country'], columns: ['gdp','life_expectancy'] }})
```
