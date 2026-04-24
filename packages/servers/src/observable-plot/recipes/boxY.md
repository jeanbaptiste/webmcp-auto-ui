---
widget: observable-plot-boxY
description: Vertical box-and-whisker plot. Quartiles and outliers along Y.
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
Distribution summaries grouped by category on X.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-boxY", params: { data: [{g:'A',v:1},{g:'A',v:3},{g:'B',v:2}], xKey:'g', yKey:'v' }})
```
