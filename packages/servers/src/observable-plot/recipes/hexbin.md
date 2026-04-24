---
widget: observable-plot-hexbin
description: Hexagonal binning of scatter points, colored by bin count.
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
    binWidth: { type: number, description: "Hexagon radius in pixels (default 20)" }
---

## When to use
Dense scatter data where overlapping dots obscure structure.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-hexbin", params: { x:[...],y:[...], binWidth: 15 }})
```
