---
widget: observable-plot-barY
description: Vertical bar chart. Bars extend along the Y axis, categories on the X axis.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    x: { type: array, description: "Category labels" }
    y: { type: array, description: "Values" }
    xKey: { type: string }
    yKey: { type: string }
    fill: { type: string }
    stroke: { type: string }
    sort: { type: object }
    tip: { type: boolean }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Comparing values across categories.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-barY", params: { x: ['A','B','C'], y: [10,20,15], title: 'Sales' }})
```
