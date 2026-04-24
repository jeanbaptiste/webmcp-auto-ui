---
widget: observable-plot-barX
description: Horizontal bar chart. Bars extend along the X axis, categories on the Y axis.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Array of {x, y} objects" }
    x: { type: array, description: "Values (parallel arrays mode)" }
    y: { type: array, description: "Category labels" }
    xKey: { type: string }
    yKey: { type: string }
    fill: { type: string, description: "Color or field name" }
    stroke: { type: string }
    sort: { type: object, description: "e.g. { y: 'x', reverse: true }" }
    tip: { type: boolean }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Ranking categories, comparisons with long category labels.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-barX", params: { y: ['A','B','C'], x: [10,20,15] }})
```
