---
widget: tremor-scatter-chart
description: Scatter plot with optional category/size encodings (Tremor).
group: tremor
schema:
  type: object
  required: [data, x, y]
  properties:
    title: { type: string }
    data: { type: array }
    x: { type: string }
    y: { type: string }
    category: { type: string }
    size: { type: string }
    colors: { type: array }
    showLegend: { type: boolean }
    showGridLines: { type: boolean }
---

## When to use
Relationships between two numeric variables, clustering, outliers.

## Example
```
tremor_webmcp_widget_display({name: "tremor-scatter-chart", params: {
  data: [{gdp:1,life:70,c:'A'},{gdp:5,life:80,c:'B'}],
  x:'gdp', y:'life', category:'c'
}})
```
