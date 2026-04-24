---
widget: tremor-line-chart
description: Line chart for trends and comparisons (Tremor).
group: tremor
schema:
  type: object
  required: [data, index, categories]
  properties:
    title: { type: string }
    data: { type: array }
    index: { type: string }
    categories: { type: array }
    colors: { type: array }
    curveType: { type: string }
    connectNulls: { type: boolean }
    showLegend: { type: boolean }
    showGridLines: { type: boolean }
---

## When to use
Continuous trends, multi-series line comparisons.

## Example
```
tremor_webmcp_widget_display({name: "tremor-line-chart", params: {
  data: [{x:1,y:3},{x:2,y:5}], index:'x', categories:['y']
}})
```
