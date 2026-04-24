---
widget: observable-plot-boxX
description: Horizontal box-and-whisker plot. Quartiles and outliers along X.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    x: { type: array }
    y: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    fill: { type: string }
    stroke: { type: string }
---

## When to use
Distribution summaries grouped by category on Y.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-boxX", params: { data: [{g:'A',v:1},{g:'A',v:3},{g:'B',v:2}], xKey:'v', yKey:'g' }})
```
