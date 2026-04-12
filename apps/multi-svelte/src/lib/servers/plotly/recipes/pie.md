---
widget: plotly-pie
description: Pie or donut chart. Part-of-whole relationships.
group: plotly
schema:
  type: object
  required: [values, labels]
  properties:
    title: { type: string, description: Chart title }
    values: { type: array, items: { type: number }, description: Slice values }
    labels: { type: array, items: { type: string }, description: Slice labels }
    hole: { type: number, description: "Donut hole size 0-1 (0 = pie, 0.4 = donut)" }
    textinfo: { type: string, description: "Text on slices (default 'percent+label')" }
---

## When to use
Show proportions of a whole. Use hole > 0 for donut style.

## Example
```
plotly_webmcp_widget_display({name: "plotly-pie", params: { values: [40, 30, 20, 10], labels: ['A','B','C','D'], hole: 0.4 }})
```
