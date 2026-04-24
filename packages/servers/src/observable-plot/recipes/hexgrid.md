---
widget: observable-plot-hexgrid
description: Hexagonal grid overlay, often combined with hexbin dots.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    binWidth: { type: number }
    stroke: { type: string }
---

## When to use
Background grid for hex-binned plots.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-hexgrid", params: { binWidth: 20 }})
```
